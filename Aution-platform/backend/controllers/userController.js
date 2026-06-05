import User from "../models/userSchema.js";
import Auction from "../models/auctionSchema.js";
import Notification from "../models/notificationSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import asyncErrorHandler from '../middlewares/asyncErrorHandler.js';
import { storeUploadedFile } from "../utils/fileStorage.js";
import { withAuctionTimings } from "../utils/auctionStatus.js";
import { buildWinnerHandoff } from "../utils/winnerHandoff.js";
import { closeEndedAuctions } from "../utils/auctionClosing.js";

const allowedKycDocumentFormats = ["image/png", "image/jpeg", "image/webp"];

const getSingleUploadedFile = (file, label) => {
    if (Array.isArray(file)) {
        const err = new Error(`${label} must contain exactly one image`);
        err.statusCode = 400;
        throw err;
    }
    return file;
};

const getCookieOptions = (expires) => {
    const isProduction = process.env.NODE_ENV === "production";
    const secureCookie = process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === "true"
        : isProduction;

    return {
        expires,
        httpOnly: true,
        sameSite: secureCookie ? "None" : "Lax",
        secure: secureCookie,
    };
};

const generatetoken = (id, res) => {
    const cookieExpireDays = Number(process.env.COOKIE_EXPIRE || 7);
    const token = jwt.sign(
        { id: id, mode: "production" },
        process.env.JWT_SECRET,
        { expiresIn: `${cookieExpireDays}d` }
    );
    res.cookie(
        "token",
        token,
        getCookieOptions(new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000))
    );
    return token;
}
const comparepassword = async (enteredPassword, password) => {
    return await bcrypt.compare(enteredPassword, password);
}

const verifyGoogleCredential = async (credential) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        const err = new Error("Google login is not configured");
        err.statusCode = 500;
        throw err;
    }

    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const payload = await response.json();

    if (!response.ok || payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        const err = new Error("Invalid Google sign-in token");
        err.statusCode = 401;
        throw err;
    }

    if (payload.email_verified !== true && payload.email_verified !== "true") {
        const err = new Error("Google account email is not verified");
        err.statusCode = 401;
        throw err;
    }

    return payload;
}

const register = asyncErrorHandler(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        const err = new Error("Profile Image Required");
        err.statusCode = 400;
        return next(err);
    }
    
    const { profileImage } = req.files;
    const allowedformats = ["image/png","image/jpeg","image/webp"];
    if (!allowedformats.includes(profileImage.mimetype)) {
        const err = new Error("Invalid profile image format. Only PNG, JPEG, and WebP are allowed");
        err.statusCode = 400;
        return next(err);
    }
    const {
        userName,
        email,
        password,
        address,
        phone,
        role,
        bankAccountName,
        bankAccountNumber,
        bankIFSCCode,
        bankName,
    } = req.body;

    if (!userName || !email || !password || !address || !phone || !role) {
        const err = new Error("Please fill the full form");
        err.statusCode = 400;
        return next(err);
    }
    if (!["Auctioneer", "Bidder"].includes(role)) {
        const err = new Error("Invalid role selected");
        err.statusCode = 400;
        return next(err);
    }
    if (
        role === "Auctioneer" &&
        (!bankAccountName || !bankAccountNumber || !bankIFSCCode || !bankName)
    ) {
        const err = new Error("Please provide complete bank details for auctioneer accounts");
        err.statusCode = 400;
        return next(err);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = String(phone).trim();
    const normalizedBankAccountNumber = String(bankAccountNumber || "").trim();
    const existinguser = await User.findOne({ email: normalizedEmail });
    if (existinguser) {
        const err = new Error("User already exists");
        err.statusCode = 400;
        return next(err);
    }
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
        const err = new Error("This phone number is already linked to another account");
        err.statusCode = 400;
        return next(err);
    }
    if (role === "Auctioneer") {
        const existingBankAccount = await User.findOne({
            "paymentMethods.bankTransfer.bankAccountNumber": normalizedBankAccountNumber,
        });
        if (existingBankAccount) {
            const err = new Error("This bank account is already linked to another auctioneer account");
            err.statusCode = 400;
            return next(err);
        }
    }

    const storedProfileImage = await storeUploadedFile(
        profileImage,
        "MERN_AUCTION_USERS_PROFILE_IMAGES"
    );
    const hashedpassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        userName,
        email: normalizedEmail,
        password: hashedpassword,
        address,
        phone: normalizedPhone,
        role,
        paymentMethods: role === "Auctioneer" ? {
            bankTransfer: {
                bankAccountName,
                bankAccountNumber: normalizedBankAccountNumber,
                bankIFSCCode,
                bankName,
            },
        } : undefined,
        profileImage: {
            public_id: storedProfileImage.public_id,
            url: storedProfileImage.url,
        }
    })

    await newUser.save();
    const userResponse = newUser.toObject();
    delete userResponse.password;
    const token = generatetoken(newUser._id,res);
    res.status(200).json({
        message: "User Registered",
        token,
        user: userResponse,
        success: true,
    });
});

const login = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();
    if(!normalizedEmail||!password){
        const err = new Error("Please fill the full form");
        err.statusCode = 400;
        return next(err);
    }
    const user = await User.findOne({email: normalizedEmail}).select("+password");
    if(!user){
        const err = new Error("User Don't exist");
        err.statusCode = 400;
        return next(err);
    }
    if(user.accountStatus === "Paused"){
        const err = new Error("Your account is paused. Please contact support.");
        err.statusCode = 403;
        return next(err);
    }
    const verifypassword = await comparepassword(password,user.password);
    if(!verifypassword){
        const err = new Error("Invalid Password");
        err.statusCode = 400;
        return next(err);
    }
    const userResponse = user.toObject();
    res.status(200).json({
        message: "Login Successful",
        token: generatetoken(user._id,res),
        success: true,
        user: userResponse
    })
})

const googleLogin = asyncErrorHandler(async (req, res, next) => {
    const { credential, role } = req.body;
    if (!credential) {
        const err = new Error("Google sign-in credential is required");
        err.statusCode = 400;
        return next(err);
    }
    if (role === "Auctioneer") {
        const err = new Error("Auctioneer accounts must use regular signup so bank details can be verified");
        err.statusCode = 400;
        return next(err);
    }

    const googleUser = await verifyGoogleCredential(credential);
    const email = googleUser.email?.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
        const hashedpassword = await bcrypt.hash(
            `${googleUser.sub}.${process.env.JWT_SECRET}`,
            10
        );
        user = await User.create({
            userName: googleUser.name || email.split("@")[0],
            email,
            googleId: googleUser.sub,
            password: hashedpassword,
            address: "Google account",
            role: ["Auctioneer", "Bidder"].includes(role) ? role : "Bidder",
            profileImage: {
                public_id: `google-${googleUser.sub}`,
                url: googleUser.picture,
            },
        });
    } else if (!user.googleId) {
        user.googleId = googleUser.sub;
        if (!user.profileImage?.url && googleUser.picture) {
            user.profileImage = {
                public_id: `google-${googleUser.sub}`,
                url: googleUser.picture,
            };
        }
        await user.save();
    }
    if(user.accountStatus === "Paused"){
        const err = new Error("Your account is paused. Please contact support.");
        err.statusCode = 403;
        return next(err);
    }

    res.status(200).json({
        message: "Google login successful",
        token: generatetoken(user._id,res),
        success: true,
        user,
    });
})

const getUserprofile = (req,res)=>{
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
        message:"User profile"
    })
}

const submitKyc = asyncErrorHandler(async (req, res, next) => {
    if (req.user.role !== "Auctioneer") {
        const err = new Error("KYC is required only for auctioneer accounts");
        err.statusCode = 400;
        return next(err);
    }
    if (req.user.kycStatus === "Approved") {
        const err = new Error("Your KYC is already approved");
        err.statusCode = 400;
        return next(err);
    }
    if (!req.files?.idProof || !req.files?.selfie) {
        const err = new Error("ID proof and selfie are required for KYC");
        err.statusCode = 400;
        return next(err);
    }

    const idProof = getSingleUploadedFile(req.files.idProof, "ID proof");
    const selfie = getSingleUploadedFile(req.files.selfie, "Selfie");
    const addressProof = req.files.addressProof
        ? getSingleUploadedFile(req.files.addressProof, "Address proof")
        : undefined;

    for (const file of [idProof, selfie, addressProof].filter(Boolean)) {
        if (!allowedKycDocumentFormats.includes(file.mimetype)) {
            const err = new Error("KYC documents must be PNG, JPEG, or WebP images");
            err.statusCode = 400;
            return next(err);
        }
    }

    const storedDocuments = {
        idProof: await storeUploadedFile(idProof, "PRIMEBID_KYC_ID_PROOFS"),
        selfie: await storeUploadedFile(selfie, "PRIMEBID_KYC_SELFIES"),
    };
    if (addressProof) {
        storedDocuments.addressProof = await storeUploadedFile(
            addressProof,
            "PRIMEBID_KYC_ADDRESS_PROOFS"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            kycStatus: "Pending",
            kycDocuments: storedDocuments,
            kycRejectionReason: "",
            kycSubmittedAt: new Date(),
            $unset: {
                kycReviewedAt: "",
                kycReviewedBy: "",
            },
        },
        { new: true }
    );

    return res.status(200).json({
        success: true,
        message: "KYC submitted for admin review",
        user,
    });
});

const logout = asyncErrorHandler(async (req, res, next) => {
    res.cookie(
        "token",
        null,
        getCookieOptions(new Date(Date.now()))
    ).status(200).json({
        message: "Logout Successful",
        success: true,
    });
})

const fetchLeaderboard = asyncErrorHandler(async (req, res, next) => {
    const users = await User.find({
        $or: [{ moneySpent: { $gt: 0 } }, { moneyspend: { $gt: 0 } }],
    });
    const leaderboard = users.sort((a, b) => {
        const aSpent = a.moneySpent || a.moneyspend || 0;
        const bSpent = b.moneySpent || b.moneyspend || 0;
        return bSpent - aSpent;
    });
    res.status(200).json({
      success: true,
      leaderboard,
    });
  });

const getWatchlist = asyncErrorHandler(async (req, res, next) => {
    const now = new Date();
    const user = await User.findById(req.user._id).populate("watchlist");
    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        watchlist: withAuctionTimings(user?.watchlist || [], now),
    });
});

const addToWatchlist = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error("Invalid auction ID format");
        err.statusCode = 400;
        return next(err);
    }
    const auction = await Auction.findById(id);
    if (!auction) {
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if (auction.createdBy?.toString() === req.user._id.toString()) {
        const err = new Error("You cannot save your own auction to watchlist");
        err.statusCode = 400;
        return next(err);
    }

    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { watchlist: auction._id },
    });

    const now = new Date();
    const user = await User.findById(req.user._id).populate("watchlist");
    return res.status(200).json({
        success: true,
        message: "Auction saved to watchlist",
        serverTime: now.toISOString(),
        watchlist: withAuctionTimings(user.watchlist, now),
    });
});

const removeFromWatchlist = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error("Invalid auction ID format");
        err.statusCode = 400;
        return next(err);
    }

    await User.findByIdAndUpdate(req.user._id, {
        $pull: { watchlist: id },
    });

    const now = new Date();
    const user = await User.findById(req.user._id).populate("watchlist");
    return res.status(200).json({
        success: true,
        message: "Auction removed from watchlist",
        serverTime: now.toISOString(),
        watchlist: withAuctionTimings(user.watchlist, now),
    });
});

const getWonAuctions = asyncErrorHandler(async (req, res, next) => {
    const now = new Date();
    await closeEndedAuctions({
        now,
        reason: "won-auctions-read",
        limit: 10,
    });
    const items = await Auction.find({
        highestBidder: req.user._id,
        status: { $ne: "Draft" },
    })
        .populate("createdBy", "userName email phone paymentMethods reputation")
        .sort({ endTime: -1 });
    const fulfillments = await Fulfillment.find({
        bidder: req.user._id,
        auction: { $in: items.map((item) => item._id) },
    }).sort({ updatedAt: -1 });
    const fulfillmentByAuction = new Map(
        fulfillments.map((fulfillment) => [
            fulfillment.auction.toString(),
            fulfillment.toObject(),
        ])
    );

    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        items: withAuctionTimings(items, now).map((item) => ({
            ...item,
            winnerHandoff: buildWinnerHandoff(item),
            fulfillment: fulfillmentByAuction.get(item._id.toString()) || null,
        })),
    });
});

const getNotifications = asyncErrorHandler(async (req, res, next) => {
    const notifications = await Notification.find({ user: req.user._id })
        .populate("auction")
        .sort({ createdAt: -1 })
        .limit(40);
    const unreadCount = await Notification.countDocuments({
        user: req.user._id,
        read: false,
    });

    return res.status(200).json({
        success: true,
        notifications,
        unreadCount,
    });
});

const markNotificationsRead = asyncErrorHandler(async (req, res, next) => {
    await Notification.updateMany(
        { user: req.user._id, read: false },
        { read: true }
    );
    return res.status(200).json({
        success: true,
        message: "Notifications marked as read",
    });
});

export {
    register,
    login,
    googleLogin,
    logout,
    getUserprofile,
    fetchLeaderboard,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getWonAuctions,
    getNotifications,
    markNotificationsRead,
    submitKyc,
};
