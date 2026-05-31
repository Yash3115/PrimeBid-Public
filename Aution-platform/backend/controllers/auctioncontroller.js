import mongoose from "mongoose";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Auction from "../models/auctionSchema.js";
import Bid from "../models/bidSchema.js";
import User from "../models/userSchema.js";
import Review from "../models/reviewSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import { AUCTION_CATEGORIES, AUCTION_CONDITIONS } from "../constants/auctionOptions.js";
import { findAutoBidByUser } from "../utils/autoBid.js";
import {
    AUCTION_RUNTIME_STATUS,
    getAuctionTiming,
    withAuctionTiming,
    withAuctionTimings,
} from "../utils/auctionStatus.js";
import { storeUploadedFile } from "../utils/fileStorage.js";
import { SETTLEMENT_STATUS } from "../utils/fulfillment.js";
import {
    buildSellerQualityMap,
    buildSellerQualityProfile,
} from "../utils/sellerQuality.js";
import {
    MARKETPLACE_STATUS,
    buildMarketplacePagination,
    buildMarketplaceQuery,
    getRuntimeStatusQuery,
} from "../utils/auctionMarketplace.js";

const allowedImageFormats = ["image/png", "image/jpeg", "image/webp"];

const toSellerId = (seller) =>
    seller?._id?.toString?.() || seller?.toString?.() || "";

const attachSellerQuality = async (items, now, sellerAuctions = items) => {
    const timedItems = withAuctionTimings(items, now);
    const sellers = timedItems
        .map((item) => item.createdBy)
        .filter((seller) => seller && typeof seller === "object");
    const sellerIds = [...new Set(sellers.map(toSellerId).filter(Boolean))];

    if (!sellerIds.length) return timedItems;

    const [fulfillments, allSellerAuctions] = await Promise.all([
        Fulfillment.find({ seller: { $in: sellerIds } })
            .select("seller status settlementStatus settlement dispute addressSubmittedAt shipping updatedAt")
            .lean(),
        sellerAuctions === items
            ? Promise.resolve(sellerAuctions)
            : Auction.find({ createdBy: { $in: sellerIds } })
                .select("createdBy status startTime endTime")
                .lean(),
    ]);
    const sellerQualityMap = buildSellerQualityMap({
        sellers,
        fulfillments,
        auctions: allSellerAuctions,
        now,
    });

    return timedItems.map((item) => ({
        ...item,
        sellerQuality: sellerQualityMap.get(toSellerId(item.createdBy)) || null,
    }));
};

const getListingIntelligence = ({ title = "", description = "", startingBid = 0, category = "", condition = "" }) => {
    let score = 0;
    const tips = [];
    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const openingBid = Number(startingBid || 0);

    if (cleanTitle.length >= 12) score += 18;
    else tips.push("Use a clearer title with brand, model, or defining detail.");
    if (cleanDescription.length >= 120) score += 24;
    else tips.push("Add condition notes, included accessories, and visible defects.");
    if (category) score += 12;
    if (condition) score += 12;
    if (openingBid > 0) score += 14;
    if (cleanDescription.length >= 240) score += 10;
    if (/\b(original|certificate|warranty|serial|receipt|dimensions|year|model)\b/i.test(cleanDescription)) {
        score += 10;
    } else {
        tips.push("Add proof, dimensions, serial/model, warranty, or receipt details if available.");
    }

    const categoryMultipliers = {
        Electronics: 1.22,
        Furniture: 1.12,
        "Art & Antiques": 1.35,
        "Jewelry & Watches": 1.4,
        Automobiles: 1.5,
        "Real Estate": 1.65,
        Collectibles: 1.28,
        "Fashion & Accessories": 1.16,
        "Sports Memorabilia": 1.26,
        "Books & Manuscripts": 1.14,
    };
    const conditionMultiplier = condition === "New" ? 1.18 : 1;
    const categoryMultiplier = categoryMultipliers[category] || 1.18;
    const recommended = Math.max(1, Math.round(openingBid * categoryMultiplier * conditionMultiplier));

    return {
        qualityScore: Math.min(100, score),
        qualityTips: tips,
        priceSuggestion: {
            low: Math.max(1, Math.round(recommended * 0.82)),
            recommended,
            high: Math.max(1, Math.round(recommended * 1.18)),
            note: "Heuristic estimate based on category, condition, and starting bid.",
        },
    };
};

const validateAuctionPayload = ({ title, description, startTime, endTime, startingBid, category, condition }, next) => {
    if (!title || !description || !startTime || !endTime || !startingBid || !category || !condition) {
        const err = new Error("Please provide all details");
        err.statusCode = 400;
        return { err };
    }
    if (!AUCTION_CATEGORIES.includes(category)) {
        const err = new Error("Invalid auction category");
        err.statusCode = 400;
        return { err };
    }
    if (!AUCTION_CONDITIONS.includes(condition)) {
        const err = new Error("Invalid auction condition");
        err.statusCode = 400;
        return { err };
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    const openingBid = Number(startingBid);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error("Invalid date format provided for startTime or endTime");
        err.statusCode = 400;
        return { err };
    }
    if (!Number.isFinite(openingBid) || openingBid <= 0) {
        const err = new Error("Starting bid must be a positive number");
        err.statusCode = 400;
        return { err };
    }
    if(start<Date.now()) {
        const err = new Error("Auction starting time must be greater than present time");
        err.statusCode = 400;
        return { err };
    }
    if (end <= start) {
        const err = new Error("Auction ending time must be greater than starting time");
        err.statusCode = 400;
        return { err };
    }
    return { start, end, openingBid };
};

const addnewAuction = asyncErrorHandler(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        const err = new Error("Image Required");
        err.statusCode = 400;
        return next(err);
    }
    const { image } = req.files;

    if (!allowedImageFormats.includes(image.mimetype)) {
        const err = new Error("Invalid profile image format. Only PNG, JPEG, and WebP are allowed");
        err.statusCode = 400;
        return next(err);
    }

    const { title, description, startTime, endTime, startingBid, category, condition } = req.body;
    const validation = validateAuctionPayload(
        { title, description, startTime, endTime, startingBid, category, condition }
    );
    if (validation.err) {
        return next(validation.err);
    }
    const { start, end, openingBid } = validation;
    const minimumBidIncrement = Math.max(1, Number(req.body.minimumBidIncrement || 100));
    const antiSnipingExtensionMinutes = Math.max(0, Number(req.body.antiSnipingExtensionMinutes || 2));
    if (!Number.isFinite(minimumBidIncrement) || !Number.isFinite(antiSnipingExtensionMinutes)) {
        const err = new Error("Bid increment and extension values must be valid numbers");
        err.statusCode = 400;
        return next(err);
    }

    try {
        const storedImage = await storeUploadedFile(
            image,
            "MERN_AUCTION_PLATFORM_AUCTION_DETAILS"
        );
        const newAuction = new Auction({
            title,
            description,
            startTime: start,
            endTime: end,
            startingBid: openingBid,
            currentBid: openingBid,
            minimumBidIncrement,
            antiSnipingExtensionMinutes,
            status: "Published",
            image: {
                public_id: storedImage.public_id,
                url: storedImage.url
            },
            ...getListingIntelligence({ title, description, startingBid: openingBid, category, condition }),
            category,
            condition,
            createdBy: req.user._id,
        })

        await newAuction.save();
        const now = new Date();
        return res.status(201).json({
            success: true,
            message: `Auction item created and will be listed on auction page at ${startTime}`,
            serverTime: now.toISOString(),
            newAuction: withAuctionTiming(newAuction, now)
        })
    } catch (error) {
        const err = new Error(error.message || "failed to create auction");
        err.statusCode = 500;
        return next(err);
    }

})

const getAllItem = asyncErrorHandler(async(req,res,next)=>{
    const now = new Date();
    const marketplaceQuery = buildMarketplaceQuery(req.query, now);
    const statusList = [
        MARKETPLACE_STATUS.LIVE,
        MARKETPLACE_STATUS.UPCOMING,
        MARKETPLACE_STATUS.ENDED,
    ];
    const [items, totalItems, baseTotalItems, statusCountRows] = await Promise.all([
        Auction.find(marketplaceQuery.mongoQuery)
            .populate("createdBy", "userName reputation kycStatus accountStatus createdAt")
            .sort(marketplaceQuery.sortQuery)
            .skip(marketplaceQuery.skip)
            .limit(marketplaceQuery.limit),
        Auction.countDocuments(marketplaceQuery.mongoQuery),
        Auction.countDocuments(marketplaceQuery.baseQuery),
        Promise.all(
            statusList.map(async (status) => [
                status,
                await Auction.countDocuments({
                    ...marketplaceQuery.baseQuery,
                    ...getRuntimeStatusQuery(status, now),
                }),
            ])
        ),
    ]);
    const itemsWithQuality = await attachSellerQuality(items, now, null);
    const statusCounts = Object.fromEntries(statusCountRows);
    statusCounts.All = baseTotalItems;
    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        items: itemsWithQuality,
        count: itemsWithQuality.length,
        totalCount: totalItems,
        pagination: buildMarketplacePagination({
            page: marketplaceQuery.page,
            limit: marketplaceQuery.limit,
            totalItems,
        }),
        filters: marketplaceQuery.filters,
        facets: {
            statusCounts,
            categories: AUCTION_CATEGORIES,
            conditions: AUCTION_CONDITIONS,
        },
    })
})

const saveAuctionDraft = asyncErrorHandler(async(req,res,next)=>{
    const {
        title = "Untitled draft",
        description = "",
        startTime,
        endTime,
        startingBid,
        category,
        condition,
    } = req.body;

    if (category && !AUCTION_CATEGORIES.includes(category)) {
        const err = new Error("Invalid auction category");
        err.statusCode = 400;
        return next(err);
    }
    if (condition && !AUCTION_CONDITIONS.includes(condition)) {
        const err = new Error("Invalid auction condition");
        err.statusCode = 400;
        return next(err);
    }

    let imageData;
    if(req.files?.image){
        const { image } = req.files;
        if (!allowedImageFormats.includes(image.mimetype)) {
            const err = new Error("Invalid image format. Only PNG, JPEG, and WebP are allowed");
            err.statusCode = 400;
            return next(err);
        }
        const storedImage = await storeUploadedFile(
            image,
            "MERN_AUCTION_PLATFORM_AUCTION_DETAILS"
        );
        imageData = {
            public_id: storedImage.public_id,
            url: storedImage.url
        };
    }

    const openingBid = Number(startingBid || 0);
    const newAuction = await Auction.create({
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        startingBid: Number.isFinite(openingBid) ? openingBid : 0,
        currentBid: Number.isFinite(openingBid) ? openingBid : 0,
        category,
        condition,
        status: "Draft",
        image: imageData,
        createdBy: req.user._id,
        ...getListingIntelligence({ title, description, startingBid: openingBid, category, condition }),
    });

    const now = new Date();
    return res.status(201).json({
        success: true,
        message: "Auction draft saved",
        serverTime: now.toISOString(),
        auctionItem: withAuctionTiming(newAuction, now),
    });
});

const getMyAuctionItems = asyncErrorHandler(async(req,res,next)=>{
    const now = new Date();
    const items = await Auction.find({createdBy: req.user._id});
    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        items: withAuctionTimings(items, now),
    })
})

const getAuctionDetails = asyncErrorHandler(async(req,res,next)=>{
    const now = new Date();
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID Format");
        err.statusCode = 400;
        return next(err);
    }

    const auctionItem = await Auction.findById(id).populate(
        "createdBy",
        "userName email reputation kycStatus accountStatus createdAt"
    );
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    const bidders = [...auctionItem.bids].sort((a,b)=> b.amount-a.amount);
    const myAutoBid = req.user?._id
        ? findAutoBidByUser(auctionItem.autoBids, req.user._id)
        : null;
    const [auctionWithQuality] = await attachSellerQuality([auctionItem], now, null);
    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        auctionItem: auctionWithQuality || withAuctionTiming(auctionItem, now),
        bidders,
        myAutoBid: myAutoBid
            ? {
                active: true,
                maxAmount: Number(myAutoBid.maxAmount || 0),
            }
            : {
                active: false,
                maxAmount: null,
            },
    })
})

const updateAuctionItem = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }
    let auctionItem = await Auction.findById(id);
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(auctionItem.createdBy?.toString() !== req.user._id.toString()){
        const err = new Error("You can only edit your own auction items");
        err.statusCode = 403;
        return next(err);
    }
    const currentTiming = getAuctionTiming(auctionItem);
    if(
        auctionItem.status !== "Draft" &&
        [AUCTION_RUNTIME_STATUS.LIVE, AUCTION_RUNTIME_STATUS.ENDED].includes(currentTiming.runtimeStatus)
    ){
        const err = new Error("Auction can only be edited before it starts");
        err.statusCode = 400;
        return next(err);
    }

    const { title, description, category, condition, startingBid, startTime, endTime, minimumBidIncrement, antiSnipingExtensionMinutes } = req.body;
    const updateData = {};

    if(title) updateData.title = title;
    if(description) updateData.description = description;
    if(category) {
        if (!AUCTION_CATEGORIES.includes(category)) {
            const err = new Error("Invalid auction category");
            err.statusCode = 400;
            return next(err);
        }
        updateData.category = category;
    }
    if(condition) {
        if (!AUCTION_CONDITIONS.includes(condition)) {
            const err = new Error("Invalid auction condition");
            err.statusCode = 400;
            return next(err);
        }
        updateData.condition = condition;
    }
    if(startingBid !== undefined) {
        const openingBid = Number(startingBid);
        if(!Number.isFinite(openingBid) || openingBid <= 0){
            const err = new Error("Starting bid must be a positive number");
            err.statusCode = 400;
            return next(err);
        }
        updateData.startingBid = openingBid;
        updateData.currentBid = openingBid;
    }
    if(minimumBidIncrement !== undefined) {
        const increment = Number(minimumBidIncrement);
        if(!Number.isFinite(increment) || increment <= 0){
            const err = new Error("Minimum bid increment must be a positive number");
            err.statusCode = 400;
            return next(err);
        }
        updateData.minimumBidIncrement = increment;
    }
    if(antiSnipingExtensionMinutes !== undefined) {
        const extension = Number(antiSnipingExtensionMinutes);
        if(!Number.isFinite(extension) || extension < 0){
            const err = new Error("Anti-sniping extension must be zero or greater");
            err.statusCode = 400;
            return next(err);
        }
        updateData.antiSnipingExtensionMinutes = extension;
    }

    const nextStartTime = startTime ? new Date(startTime) : auctionItem.startTime ? new Date(auctionItem.startTime) : null;
    const nextEndTime = endTime ? new Date(endTime) : auctionItem.endTime ? new Date(auctionItem.endTime) : null;
    const shouldValidateDates = startTime || endTime || auctionItem.status !== "Draft";

    if(shouldValidateDates){
        if(!nextStartTime || !nextEndTime || isNaN(nextStartTime.getTime()) || isNaN(nextEndTime.getTime())){
            const err = new Error("Invalid date format provided for startTime or endTime");
            err.statusCode = 400;
            return next(err);
        }
        if(nextStartTime < Date.now()){
            const err = new Error("Auction starting time must be greater than present time");
            err.statusCode = 400;
            return next(err);
        }
        if(nextEndTime <= nextStartTime){
            const err = new Error("Auction ending time must be greater than starting time");
            err.statusCode = 400;
            return next(err);
        }

        updateData.startTime = nextStartTime;
        updateData.endTime = nextEndTime;
    }

    if(req.files?.image){
        const { image } = req.files;
        if (!allowedImageFormats.includes(image.mimetype)) {
            const err = new Error("Invalid image format. Only PNG, JPEG, and WebP are allowed");
            err.statusCode = 400;
            return next(err);
        }
        const storedImage = await storeUploadedFile(
            image,
            "MERN_AUCTION_PLATFORM_AUCTION_DETAILS"
        );
        updateData.image = {
            public_id: storedImage.public_id,
            url: storedImage.url
        };
    }

    Object.assign(
        updateData,
        getListingIntelligence({
            title: updateData.title || auctionItem.title,
            description: updateData.description || auctionItem.description,
            startingBid: updateData.startingBid || auctionItem.startingBid,
            category: updateData.category || auctionItem.category,
            condition: updateData.condition || auctionItem.condition,
        })
    );

    auctionItem = await Auction.findByIdAndUpdate(id, updateData, { new: true });
    const now = new Date();
    return res.status(200).json({
        success: true,
        message: "Auction updated successfully",
        serverTime: now.toISOString(),
        auctionItem: withAuctionTiming(auctionItem, now),
    });
})

const publishAuctionDraft = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }
    let auctionItem = await Auction.findById(id);
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(auctionItem.createdBy?.toString() !== req.user._id.toString()){
        const err = new Error("You can only publish your own auction drafts");
        err.statusCode = 403;
        return next(err);
    }

    const payload = {
        title: req.body.title || auctionItem.title,
        description: req.body.description || auctionItem.description,
        startTime: req.body.startTime || auctionItem.startTime,
        endTime: req.body.endTime || auctionItem.endTime,
        startingBid: req.body.startingBid || auctionItem.startingBid,
        category: req.body.category || auctionItem.category,
        condition: req.body.condition || auctionItem.condition,
    };
    const validation = validateAuctionPayload(payload);
    if (validation.err) {
        return next(validation.err);
    }
    if(!auctionItem.image?.url && !req.files?.image){
        const err = new Error("Image Required");
        err.statusCode = 400;
        return next(err);
    }

    const minimumBidIncrement = Number(req.body.minimumBidIncrement || auctionItem.minimumBidIncrement || 100);
    const antiSnipingExtensionMinutes = Number(req.body.antiSnipingExtensionMinutes || auctionItem.antiSnipingExtensionMinutes || 2);
    if(!Number.isFinite(minimumBidIncrement) || minimumBidIncrement <= 0 || !Number.isFinite(antiSnipingExtensionMinutes) || antiSnipingExtensionMinutes < 0){
        const err = new Error("Bid increment and extension values must be valid numbers");
        err.statusCode = 400;
        return next(err);
    }

    const updateData = {
        ...payload,
        startTime: validation.start,
        endTime: validation.end,
        startingBid: validation.openingBid,
        currentBid: validation.openingBid,
        minimumBidIncrement,
        antiSnipingExtensionMinutes,
        status: "Published",
        ...getListingIntelligence({
            ...payload,
            startingBid: validation.openingBid,
        }),
    };

    if(req.files?.image){
        const { image } = req.files;
        if (!allowedImageFormats.includes(image.mimetype)) {
            const err = new Error("Invalid image format. Only PNG, JPEG, and WebP are allowed");
            err.statusCode = 400;
            return next(err);
        }
        const storedImage = await storeUploadedFile(
            image,
            "MERN_AUCTION_PLATFORM_AUCTION_DETAILS"
        );
        updateData.image = {
            public_id: storedImage.public_id,
            url: storedImage.url,
        };
    }

    auctionItem = await Auction.findByIdAndUpdate(id, updateData, { new: true });
    const now = new Date();
    return res.status(200).json({
        success: true,
        message: "Auction draft published",
        serverTime: now.toISOString(),
        auctionItem: withAuctionTiming(auctionItem, now),
    });
});

const getSellerDashboard = asyncErrorHandler(async(req,res,next)=>{
    const items = await Auction.find({ createdBy: req.user._id });
    const now = new Date();
    const published = items.filter((item) => item.status !== "Draft");
    const live = published.filter((item) => getAuctionTiming(item, now).runtimeStatus === AUCTION_RUNTIME_STATUS.LIVE);
    const ended = published.filter((item) => getAuctionTiming(item, now).runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED);
    const drafts = items.filter((item) => item.status === "Draft");
    const totalBids = items.reduce((total, item) => total + (item.bids?.length || 0), 0);
    const topAuction = [...items].sort((a,b) => Number(b.currentBid || 0) - Number(a.currentBid || 0))[0] || null;
    const reviews = await Review.find({ seller: req.user._id }).sort({ createdAt: -1 }).limit(8);
    const sellerFulfillments = await Fulfillment.find({ seller: req.user._id })
        .select("seller status settlementStatus settlement dispute addressSubmittedAt shipping updatedAt")
        .lean();
    const sellerQuality = buildSellerQualityProfile({
        seller: req.user,
        fulfillments: sellerFulfillments,
        auctions: items,
        now,
    });
    const watcherStats = await User.countDocuments({ watchlist: { $in: items.map((item) => item._id) } });
    const byEndingSoon = (a, b) => new Date(a.endTime) - new Date(b.endTime);
    const byRecentUpdate = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
    const activeItems = published.filter((item) => {
        const status = getAuctionTiming(item, now).runtimeStatus;
        return status === AUCTION_RUNTIME_STATUS.LIVE || status === AUCTION_RUNTIME_STATUS.UPCOMING;
    });
    const endingSoon = [...activeItems].sort(byEndingSoon).slice(0, 5);
    const noBidAuctions = activeItems
        .filter((item) => (item.bids?.length || 0) === 0)
        .sort(byEndingSoon)
        .slice(0, 5);
    const recentAuctions = [...items].sort(byRecentUpdate).slice(0, 6);
    const fulfillmentQueue = await Fulfillment.find({
        seller: req.user._id,
        $or: [
            { status: { $ne: "Delivered" } },
            {
                settlementStatus: {
                    $in: [
                        SETTLEMENT_STATUS.HELD_IN_ESCROW,
                        SETTLEMENT_STATUS.READY_TO_RELEASE,
                        SETTLEMENT_STATUS.UNDER_DISPUTE,
                    ],
                },
            },
        ],
    })
        .populate("auction", "title image currentBid endTime")
        .populate("bidder", "userName email phone profileImage")
        .sort({ updatedAt: -1 })
        .limit(8);
    const fulfillmentStats = fulfillmentQueue.reduce(
        (stats, fulfillment) => {
            stats.total += 1;
            stats[fulfillment.status] = (stats[fulfillment.status] || 0) + 1;
            return stats;
        },
        { total: 0 }
    );

    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        stats: {
            totalAuctions: items.length,
            liveAuctions: live.length,
            endedAuctions: ended.length,
            draftAuctions: drafts.length,
            totalBids,
            watcherCount: watcherStats,
            platformFeeRate: 0.05,
            fulfillment: fulfillmentStats,
            reputation: req.user.reputation || { ratingAverage: 0, ratingCount: 0 },
            sellerQuality,
        },
        topAuction: topAuction ? withAuctionTiming(topAuction, now) : null,
        endingSoon: withAuctionTimings(endingSoon, now),
        noBidAuctions: withAuctionTimings(noBidAuctions, now),
        recentAuctions: withAuctionTimings(recentAuctions, now),
        fulfillmentQueue,
        recentReviews: reviews,
    });
});

const getSmartRecommendations = asyncErrorHandler(async(req,res,next)=>{
    const user = await User.findById(req.user._id).populate("watchlist");
    const watchedCategories = (user?.watchlist || [])
        .map((item) => item.category)
        .filter(Boolean);
    const bidHistory = await Bid.find({ "bidder.id": req.user._id }).populate("auctionItem");
    const bidCategories = bidHistory
        .map((bid) => bid.auctionItem?.category)
        .filter(Boolean);
    const categories = [...new Set([...watchedCategories, ...bidCategories])];
    const now = new Date();
    const query = {
        status: { $ne: "Draft" },
        endTime: { $gt: now },
        createdBy: { $ne: req.user._id },
        _id: { $nin: user?.watchlist?.map((item) => item._id) || [] },
    };
    if(categories.length > 0){
        query.category = { $in: categories };
    }
    const items = await Auction.find(query)
        .sort({ qualityScore: -1, currentBid: -1, endTime: 1 })
        .limit(8);

    return res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        items: withAuctionTimings(items, now),
        basis: categories,
    });
});

const reviewSeller = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }
    if(!Number.isFinite(rating) || rating < 1 || rating > 5){
        const err = new Error("Rating must be between 1 and 5");
        err.statusCode = 400;
        return next(err);
    }
    const auction = await Auction.findById(id);
    if(!auction){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(auction.highestBidder?.toString() !== req.user._id.toString()){
        const err = new Error("Only the winning bidder can rate this seller");
        err.statusCode = 403;
        return next(err);
    }
    const completedFulfillment = await Fulfillment.findOne({
        auction: auction._id,
        bidder: req.user._id,
        settlementStatus: SETTLEMENT_STATUS.RELEASED_TO_SELLER,
    });
    if(!completedFulfillment){
        const err = new Error("You can rate the seller after delivery is confirmed and escrow is released");
        err.statusCode = 400;
        return next(err);
    }
    const review = await Review.findOneAndUpdate(
        { auction: auction._id, reviewer: req.user._id },
        {
            auction: auction._id,
            reviewer: req.user._id,
            seller: auction.createdBy,
            rating,
            comment,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const sellerReviews = await Review.find({ seller: auction.createdBy });
    const ratingAverage = sellerReviews.reduce((total, item) => total + item.rating, 0) / sellerReviews.length;
    await User.findByIdAndUpdate(auction.createdBy, {
        reputation: {
            ratingAverage: Number(ratingAverage.toFixed(1)),
            ratingCount: sellerReviews.length,
        },
    });

    return res.status(200).json({
        success: true,
        message: "Seller rating saved",
        review,
    });
});

const removefromAuction = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID Format");
        err.statusCode = 400;
        return next(err);
    }
    const AuctionItem = await Auction.findById(id);
    if(!AuctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(AuctionItem.createdBy?.toString() !== req.user._id.toString()){
        const err = new Error("You can only remove your own auction items");
        err.statusCode = 403;
        return next(err);
    }
    await Bid.deleteMany({ auctionItem: AuctionItem._id });
    await AuctionItem.deleteOne();
    return res.status(200).json({
        success: true,
        message: "Auction item removed successfully",
    })
})

const republishItem = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode=400;
        return next(err);
    }
    let auctionItem = await Auction.findById(id);
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode=404;
        return next(err);
    }
    if(auctionItem.createdBy?.toString() !== req.user._id.toString()){
        const err = new Error("You can only republish your own auction items");
        err.statusCode=403;
        return next(err);
    }
    const currentTiming = getAuctionTiming(auctionItem);
    if(
        [AUCTION_RUNTIME_STATUS.UPCOMING, AUCTION_RUNTIME_STATUS.LIVE].includes(currentTiming.runtimeStatus)
    ){
        const err = new Error("Current Auction is already active");
        err.statusCode=400;
        return next(err);
    }
    const startTime = new Date(req.body.startTime);
    const endTime = new Date(req.body.endTime);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        const err = new Error("Invalid date format provided for startTime or endTime");
        err.statusCode=400;
        return next(err);
    }
    if(startTime<Date.now()){
        const err = new Error("Auction starting time must be greater than present time");
        err.statusCode=400;
        return next(err);
    }
    if(startTime>=endTime){
        const err = new Error("Auction ending time must be greater than starting time");
        err.statusCode=400;
        return next(err);
    }
    const data = {
        startTime,
        endTime,
        bids: [],
        autoBids: [],
        currentBid: auctionItem.startingBid,
        status: "Published",
        commissionCalculated: false
    }
    await Bid.deleteMany({ auctionItem: auctionItem._id });
    auctionItem = await Auction.findByIdAndUpdate(
        id,
        { $set: data, $unset: { highestBidder: "" } },
        {new: true}
    );
    const user = await User.findById(req.user._id);
    const now = new Date();
    return res.status(200).json({
        success: true,
        message: `Auction item republished and will be active from ${data.startTime}`,
        serverTime: now.toISOString(),
        auctionItem: withAuctionTiming(auctionItem, now),
        user
    })
})

export {
    addnewAuction,
    saveAuctionDraft,
    getAllItem,
    getMyAuctionItems,
    getAuctionDetails,
    updateAuctionItem,
    publishAuctionDraft,
    removefromAuction,
    republishItem,
    getSellerDashboard,
    getSmartRecommendations,
    reviewSeller,
};
