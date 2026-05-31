import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import mongoose from "mongoose";
import Auction from "../models/auctionSchema.js";
import Bid from "../models/bidSchema.js";
import User from "../models/userSchema.js";
import { createNotification } from "../utils/notifications.js";
import { applyAutoBidLimit, resolveAutoBidChallenge } from "../utils/autoBid.js";
import { AUCTION_RUNTIME_STATUS, getAuctionTiming } from "../utils/auctionStatus.js";
import {
    buildAuctionSyncSnapshot,
    bumpAuctionBidVersion,
    getAuctionBidVersion,
    publishAuctionEvent,
} from "../utils/auctionRealtime.js";
import {
    getWalletSnapshot,
    lockBidFunds,
    releaseAuctionBidLocks,
    releaseBidFunds,
} from "../utils/wallet.js";

const getHighestBidEntry = (auctionItem) =>
    [...(auctionItem.bids || [])].sort(
        (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
    )[0];

const findAuctionBidEntry = (auctionItem, userId) =>
    auctionItem.bids.find(
        (bid) => bid.userId?.toString() === userId?.toString()
    );

const getCurrentLockedAmount = (bidDoc, bidEntry) =>
    Number(bidDoc?.lockedAmount || bidEntry?.lockedAmount || 0);

const placebid = asyncErrorHandler( async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }
    const auctionItem = await Auction.findById(id);
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(auctionItem.createdBy?.toString() === req.user._id.toString()){
        const err = new Error("You cannot bid on your own auction");
        err.statusCode = 403;
        return next(err);
    }
    if(auctionItem.status === "Draft"){
        const err = new Error("This auction is still a draft");
        err.statusCode = 400;
        return next(err);
    }
    const expectedBidVersion =
        req.body.expectedBidVersion === undefined || req.body.expectedBidVersion === ""
            ? null
            : Number(req.body.expectedBidVersion);
    if(expectedBidVersion !== null && !Number.isFinite(expectedBidVersion)){
        const err = new Error("Invalid auction revision. Please refresh and try again.");
        err.statusCode = 400;
        return next(err);
    }
    if(expectedBidVersion !== null && expectedBidVersion !== getAuctionBidVersion(auctionItem)){
        return res.status(409).json({
            success: false,
            message: "Auction changed while you were bidding. Review the latest bid and try again.",
            auctionSync: buildAuctionSyncSnapshot(auctionItem, new Date()),
        });
    }
    const now = new Date();
    const timing = getAuctionTiming(auctionItem, now);
    if(timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID){
        const err = new Error("Auction has an invalid schedule");
        err.statusCode = 400;
        return next(err);
    }
    if(timing.runtimeStatus === AUCTION_RUNTIME_STATUS.UPCOMING){
        const err = new Error("Auction has not started yet");
        err.statusCode = 400;
        return next(err);
    }
    if(timing.runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED){
        const err = new Error("Auction has already ended");
        err.statusCode = 400;
        return next(err);
    }
    const {amount, maxAutoBid} = req.body;
    const bidAmount = Number(amount);
    const autoBidMax = maxAutoBid === undefined || maxAutoBid === "" ? null : Number(maxAutoBid);
    if(!Number.isFinite(bidAmount) || bidAmount <= 0){
        const err = new Error("Please place your bid");
        err.statusCode = 400;
        return next(err);
    }
    if(autoBidMax !== null && (!Number.isFinite(autoBidMax) || autoBidMax < bidAmount)){
        const err = new Error("Maximum auto-bid must be greater than or equal to your bid");
        err.statusCode = 400;
        return next(err);
    }
    const increment = Number(auctionItem.minimumBidIncrement || 1);
    const minimumNextBid = Number(auctionItem.currentBid || auctionItem.startingBid || 0) + increment;
    if(bidAmount < minimumNextBid){
        const err = new Error(`Bid amount should be at least ${minimumNextBid}`);
        err.statusCode = 400;
        return next(err);
    }

    const lockedChanges = [];
    let shouldCompensateLocks = true;

    try {
        const previousLeader = getHighestBidEntry(auctionItem);
        const bidderDetail = await User.findById(req.user._id);
        if(!bidderDetail){
            const err = new Error("Bidder not found");
            err.statusCode = 404;
            throw err;
        }

        let bidDoc = await Bid.findOne({
            "bidder.id": req.user._id,
            auctionItem: auctionItem._id
        });
        let bidEntry = findAuctionBidEntry(auctionItem, req.user._id);
        const currentLockedAmount = getCurrentLockedAmount(bidDoc, bidEntry);

        if(!bidDoc){
            bidDoc = new Bid({
                bidder:{
                    id: req.user._id,
                    userName: bidderDetail.userName,
                    profileImage: bidderDetail.profileImage?.url
                },
                auctionItem: auctionItem._id
            });
        }

        bidDoc.amount = bidAmount;
        bidDoc.maxAutoBid = autoBidMax || bidDoc.maxAutoBid;
        bidDoc.isAutoBid = false;

        const humanLockTransaction = await lockBidFunds({
            userId: req.user._id,
            auctionId: auctionItem._id,
            bidId: bidDoc._id,
            targetLockedAmount: bidAmount,
            currentLockedAmount,
            note: "Bid funds locked for active auction lead",
        });
        if(humanLockTransaction){
            lockedChanges.push({
                userId: req.user._id,
                bidId: bidDoc._id,
                amount: humanLockTransaction.amount,
                previousLockedAmount: currentLockedAmount,
            });
        }

        bidDoc.lockedAmount = bidAmount;
        await bidDoc.save();

        if(bidEntry){
            bidEntry.amount = bidAmount;
            bidEntry.lockedAmount = bidAmount;
            bidEntry.isAutoBid = false;
        } else {
            auctionItem.bids.push({
                userId: req.user._id,
                userName: bidderDetail.userName,
                profileImage: bidderDetail.profileImage?.url,
                amount: bidAmount,
                lockedAmount: bidAmount,
                isAutoBid: false
            });
            bidEntry = findAuctionBidEntry(auctionItem, req.user._id);
        }
        auctionItem.currentBid = bidAmount;

        if(autoBidMax && autoBidMax > bidAmount){
            applyAutoBidLimit({
                auction: auctionItem,
                user: bidderDetail,
                maxAmount: autoBidMax,
                currentBidAmount: bidAmount,
            });
        }

        let autoBidWinner = null;
        const autoBidChallenge = resolveAutoBidChallenge({
            currentBidderId: req.user._id,
            currentBid: bidAmount,
            currentBidderMax: autoBidMax,
            increment,
            autoBids: auctionItem.autoBids,
        });

        if(autoBidChallenge?.winner === "current"){
            const finalAmount = autoBidChallenge.currentFinalAmount;
            const extraLockTransaction = await lockBidFunds({
                userId: req.user._id,
                auctionId: auctionItem._id,
                bidId: bidDoc._id,
                targetLockedAmount: finalAmount,
                currentLockedAmount: bidAmount,
                note: "Auto-bid funds locked after a competing max bid",
            });
            if(extraLockTransaction){
                lockedChanges.push({
                    userId: req.user._id,
                    bidId: bidDoc._id,
                    amount: extraLockTransaction.amount,
                    previousLockedAmount: bidAmount,
                });
            }

            bidDoc.amount = finalAmount;
            bidDoc.lockedAmount = finalAmount;
            bidDoc.isAutoBid = true;
            await bidDoc.save();

            if(bidEntry){
                bidEntry.amount = finalAmount;
                bidEntry.lockedAmount = finalAmount;
                bidEntry.isAutoBid = true;
            }
            auctionItem.currentBid = finalAmount;

            const losingAutoBid = autoBidChallenge.autoBid;
            const losingAutoBidDoc = await Bid.findOne({
                "bidder.id": losingAutoBid.userId,
                auctionItem: auctionItem._id
            });
            const losingAutoBidEntry = findAuctionBidEntry(auctionItem, losingAutoBid.userId);
            if(losingAutoBidDoc){
                losingAutoBidDoc.amount = autoBidChallenge.autoMaxAmount;
                losingAutoBidDoc.maxAutoBid = losingAutoBid.maxAmount;
                losingAutoBidDoc.isAutoBid = true;
                await losingAutoBidDoc.save();
            }
            if(losingAutoBidEntry){
                losingAutoBidEntry.amount = autoBidChallenge.autoMaxAmount;
                losingAutoBidEntry.isAutoBid = true;
            }
        } else if(autoBidChallenge?.winner === "auto"){
            const autoBid = autoBidChallenge.autoBid;
            const autoAmount = autoBidChallenge.autoFinalAmount;
            let autoBidDoc = await Bid.findOne({
                "bidder.id": autoBid.userId,
                auctionItem: auctionItem._id
            });
            let autoBidEntry = findAuctionBidEntry(auctionItem, autoBid.userId);
            const autoCurrentLockedAmount = getCurrentLockedAmount(autoBidDoc, autoBidEntry);

            if(!autoBidDoc){
                autoBidDoc = new Bid({
                    maxAutoBid: autoBid.maxAmount,
                    bidder: {
                        id: autoBid.userId,
                        userName: autoBid.userName,
                        profileImage: autoBid.profileImage,
                    },
                    auctionItem: auctionItem._id,
                });
            }

            let autoBidFundsLocked = false;
            try {
                const autoLockTransaction = await lockBidFunds({
                    userId: autoBid.userId,
                    auctionId: auctionItem._id,
                    bidId: autoBidDoc._id,
                    targetLockedAmount: autoAmount,
                    currentLockedAmount: autoCurrentLockedAmount,
                    note: "Auto-bid funds locked for active auction lead",
                });
                if(autoLockTransaction){
                    lockedChanges.push({
                        userId: autoBid.userId,
                        bidId: autoBidDoc._id,
                        amount: autoLockTransaction.amount,
                        previousLockedAmount: autoCurrentLockedAmount,
                    });
                }
                autoBidFundsLocked = true;
            } catch (walletError) {
                await createNotification({
                    user: autoBid.userId,
                    auction: auctionItem._id,
                    type: "wallet",
                    title: "Auto-bid skipped",
                    message: `Your auto-bid on ${auctionItem.title} could not run because your wallet balance was insufficient.`,
                });
            }

            if(autoBidFundsLocked){
                autoBidDoc.amount = autoAmount;
                autoBidDoc.maxAutoBid = autoBid.maxAmount;
                autoBidDoc.lockedAmount = autoAmount;
                autoBidDoc.isAutoBid = true;
                await autoBidDoc.save();

                if(autoBidEntry){
                    autoBidEntry.amount = autoAmount;
                    autoBidEntry.lockedAmount = autoAmount;
                    autoBidEntry.isAutoBid = true;
                } else {
                    auctionItem.bids.push({
                        userId: autoBid.userId,
                        userName: autoBid.userName,
                        profileImage: autoBid.profileImage,
                        amount: autoAmount,
                        lockedAmount: autoAmount,
                        isAutoBid: true,
                    });
                }
                auctionItem.currentBid = autoAmount;
                autoBidWinner = autoBid;
            }
        }

        const endTimeMs = new Date(auctionItem.endTime).getTime();
        const extensionMinutes = Number(auctionItem.antiSnipingExtensionMinutes || 0);
        if(extensionMinutes > 0 && endTimeMs - now.getTime() <= 2 * 60 * 1000){
            auctionItem.endTime = new Date(endTimeMs + extensionMinutes * 60 * 1000);
            await createNotification({
                user: auctionItem.createdBy,
                auction: auctionItem._id,
                type: "auction_extended",
                title: "Auction extended",
                message: `${auctionItem.title} was extended after a last-minute bid.`,
            });
        }
        bumpAuctionBidVersion(auctionItem, new Date());
        await auctionItem.save();
        shouldCompensateLocks = false;

        const finalLeader = getHighestBidEntry(auctionItem);
        if(finalLeader?.userId){
            await releaseAuctionBidLocks({
                auction: auctionItem,
                exceptUserId: finalLeader.userId,
                note: "Bid lock released after being outbid",
            });
            await auctionItem.save();
        }

        if(
            previousLeader?.userId &&
            finalLeader?.userId &&
            previousLeader.userId.toString() !== finalLeader.userId.toString()
        ){
            await createNotification({
                user: previousLeader.userId,
                auction: auctionItem._id,
                type: "outbid",
                title: "You have been outbid",
                message: `A new bid was placed on ${auctionItem.title}.`,
            });
        }
        if(autoBidWinner){
            await createNotification({
                user: req.user._id,
                auction: auctionItem._id,
                type: "outbid",
                title: "Auto-bid responded",
                message: `${autoBidWinner.userName}'s auto-bid is currently leading ${auctionItem.title}.`,
            });
        }

        const auctionSync = buildAuctionSyncSnapshot(auctionItem, new Date());
        publishAuctionEvent(auctionItem._id, {
            type: "bid",
            snapshot: auctionSync,
        });
        const refreshedBidder = await User.findById(req.user._id);
        return res.status(201).json({
            success: true,
            message: "Bid Placed",
            currentBid: auctionItem.currentBid,
            endTime: auctionItem.endTime,
            runtimeStatus: auctionSync.runtimeStatus,
            serverTime: auctionSync.serverTime,
            auctionSync,
            wallet: getWalletSnapshot(refreshedBidder),
        });
    } catch (error) {
        if(shouldCompensateLocks){
            for(const change of lockedChanges.reverse()){
                await releaseBidFunds({
                    userId: change.userId,
                    auctionId: auctionItem._id,
                    bidId: change.bidId,
                    amount: change.amount,
                    note: "Bid lock rolled back after failed bid placement",
                });
                await Bid.findByIdAndUpdate(change.bidId, {
                    lockedAmount: change.previousLockedAmount,
                });
            }
        }
        const err = new Error(error.message || "Failed to place bid");
        err.statusCode = error.statusCode || 500;
        return next(err);
    }
})

export const manageAutoBid = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }

    const auctionItem = await Auction.findById(id);
    if(!auctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    if(auctionItem.status === "Draft"){
        const err = new Error("This auction is still a draft");
        err.statusCode = 400;
        return next(err);
    }
    const expectedBidVersion =
        req.body.expectedBidVersion === undefined || req.body.expectedBidVersion === ""
            ? null
            : Number(req.body.expectedBidVersion);
    if(expectedBidVersion !== null && !Number.isFinite(expectedBidVersion)){
        const err = new Error("Invalid auction revision. Please refresh and try again.");
        err.statusCode = 400;
        return next(err);
    }
    if(expectedBidVersion !== null && expectedBidVersion !== getAuctionBidVersion(auctionItem)){
        return res.status(409).json({
            success: false,
            message: "Auction changed while you were updating auto-bid. Review the latest state and try again.",
            auctionSync: buildAuctionSyncSnapshot(auctionItem, new Date()),
        });
    }

    const timing = getAuctionTiming(auctionItem);
    if(timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID){
        const err = new Error("Auction has an invalid schedule");
        err.statusCode = 400;
        return next(err);
    }
    if(timing.runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED){
        const err = new Error("Auction has already ended");
        err.statusCode = 400;
        return next(err);
    }

    const bidDoc = await Bid.findOne({
        "bidder.id": req.user._id,
        auctionItem: auctionItem._id,
    });
    const bidEntry = findAuctionBidEntry(auctionItem, req.user._id);
    const currentBidAmount = Number(bidDoc?.amount || bidEntry?.amount || 0);
    if(!bidDoc && !bidEntry){
        const err = new Error("Place a bid before managing auto-bid");
        err.statusCode = 400;
        return next(err);
    }

    const shouldCancel =
        req.body.action === "cancel" ||
        req.body.enabled === false ||
        req.body.maxAutoBid === "" ||
        req.body.maxAutoBid === null ||
        req.body.maxAutoBid === undefined;
    const requestedMax = shouldCancel ? null : Number(req.body.maxAutoBid);
    if(!shouldCancel && (!Number.isFinite(requestedMax) || requestedMax <= 0)){
        const err = new Error("Auto-bid max must be a positive number");
        err.statusCode = 400;
        return next(err);
    }

    const result = applyAutoBidLimit({
        auction: auctionItem,
        user: req.user,
        maxAmount: requestedMax,
        currentBidAmount,
    });

    if(bidDoc){
        if(result.active){
            bidDoc.maxAutoBid = result.maxAmount;
        } else {
            bidDoc.maxAutoBid = undefined;
        }
        await bidDoc.save();
    }
    const now = new Date();
    bumpAuctionBidVersion(auctionItem, now);
    await auctionItem.save();
    const auctionSync = buildAuctionSyncSnapshot(auctionItem, now);
    publishAuctionEvent(auctionItem._id, {
        type: "auction_updated",
        snapshot: auctionSync,
    });

    return res.status(200).json({
        success: true,
        message: result.active
            ? "Auto-bid limit updated"
            : "Auto-bid cancelled. Your existing bid remains active.",
        autoBid: {
            active: result.active,
            maxAmount: result.maxAmount,
        },
        currentBid: auctionItem.currentBid,
        runtimeStatus: auctionSync.runtimeStatus,
        serverTime: auctionSync.serverTime,
        auctionSync,
    });
});

export default placebid;
