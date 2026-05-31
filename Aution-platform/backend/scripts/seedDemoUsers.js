import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connection } from "../db/connection.js";
import User from "../models/userSchema.js";
import WalletTransaction from "../models/walletTransactionSchema.js";

dotenv.config();

const PROFILE_IMAGE = {
    public_id: "primebid-demo-profile",
    url: "/imageHolder.jpg",
};

const toNumber = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
};

const mergeWallet = (existingWallet, targetWallet = {}) => {
    const existing = existingWallet || {};
    return {
        availableBalance: Math.max(
            toNumber(existing.availableBalance),
            toNumber(targetWallet.availableBalance)
        ),
        lockedBalance: Math.max(toNumber(existing.lockedBalance), 0),
        lifetimeDeposited: Math.max(
            toNumber(existing.lifetimeDeposited),
            toNumber(targetWallet.lifetimeDeposited)
        ),
        lifetimeWithdrawn: Math.max(toNumber(existing.lifetimeWithdrawn), 0),
    };
};

const demoUsers = [
    {
        userName: "PrimeBid Admin",
        email: "admin@primebid.local",
        password: "PrimeBid@123",
        phone: "9000000001",
        address: "PrimeBid admin workspace",
        role: "Super Admin",
        kycStatus: "Approved",
        accountStatus: "Active",
        wallet: {
            availableBalance: 0,
            lockedBalance: 0,
            lifetimeDeposited: 0,
            lifetimeWithdrawn: 0,
        },
    },
    {
        userName: "Demo Auctioneer",
        email: "auctioneer@primebid.local",
        password: "Auctioneer@123",
        phone: "9000000002",
        address: "Demo auctioneer address",
        role: "Auctioneer",
        kycStatus: "Approved",
        kycRejectionReason: "",
        accountStatus: "Active",
        wallet: {
            availableBalance: 0,
            lockedBalance: 0,
            lifetimeDeposited: 0,
            lifetimeWithdrawn: 0,
        },
        paymentMethods: {
            bankTransfer: {
                bankAccountName: "Demo Auctioneer",
                bankAccountNumber: "PBDEMOAUCT0002",
                bankIFSCCode: "HDFC0001234",
                bankName: "HDFC Bank",
            },
        },
    },
    {
        userName: "Demo Bidder",
        email: "bidder@primebid.local",
        password: "Bidder@123",
        phone: "9000000003",
        address: "Demo bidder address",
        role: "Bidder",
        kycStatus: "Approved",
        accountStatus: "Active",
        wallet: {
            availableBalance: 100000,
            lockedBalance: 0,
            lifetimeDeposited: 100000,
            lifetimeWithdrawn: 0,
        },
        buyerStats: {
            completedPurchases: 0,
            defaults: 0,
            disputesLost: 0,
        },
    },
];

const seedDemoUser = async (demoUser) => {
    const normalizedEmail = demoUser.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).select(
        "+password"
    );
    const hashedPassword = await bcrypt.hash(demoUser.password, 10);
    const user = existingUser || new User({ email: normalizedEmail });

    user.userName = demoUser.userName;
    user.password = hashedPassword;
    user.phone = demoUser.phone;
    user.address = demoUser.address;
    user.role = demoUser.role;
    user.accountStatus = demoUser.accountStatus;
    user.kycStatus = demoUser.kycStatus;
    user.kycRejectionReason = demoUser.kycRejectionReason || "";
    user.profileImage = user.profileImage?.url ? user.profileImage : PROFILE_IMAGE;
    user.wallet = mergeWallet(user.wallet, demoUser.wallet);
    user.buyerStats = {
        completedPurchases: toNumber(user.buyerStats?.completedPurchases),
        defaults: toNumber(user.buyerStats?.defaults),
        disputesLost: toNumber(user.buyerStats?.disputesLost),
        ...demoUser.buyerStats,
    };

    if (demoUser.paymentMethods) {
        user.paymentMethods = demoUser.paymentMethods;
    }

    if (demoUser.role === "Auctioneer") {
        user.kycSubmittedAt = user.kycSubmittedAt || new Date();
        user.kycReviewedAt = new Date();
        user.unpaidCommission = 0;
    }

    await user.save();
    return user;
};

const ensureDemoTopUpHistory = async (user) => {
    const reference = "DEMO-SEED-BIDDER-TOPUP-100000";
    const existingTransaction = await WalletTransaction.findOne({
        user: user._id,
        reference,
    });

    const availableBalance = toNumber(user.wallet?.availableBalance);
    if (existingTransaction || availableBalance < 100000) {
        return;
    }

    await WalletTransaction.create({
        user: user._id,
        type: "TOP_UP",
        amount: 100000,
        availableBefore: 0,
        availableAfter: availableBalance,
        lockedBefore: 0,
        lockedAfter: toNumber(user.wallet?.lockedBalance),
        status: "Completed",
        paymentMethod: "UPI",
        reference,
        note: "Demo wallet balance seeded for local testing",
    });
};

try {
    await connection();

    for (const demoUser of demoUsers) {
        const user = await seedDemoUser(demoUser);
        if (demoUser.email === "bidder@primebid.local") {
            await ensureDemoTopUpHistory(user);
        }

        console.log(
            `Updated ${demoUser.role}: ${demoUser.email} (${user.accountStatus}, KYC ${user.kycStatus})`
        );
    }

    console.log("Demo users are ready.");
} catch (error) {
    console.error(`Demo user seed failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
