import mongoose from "mongoose";
import asyncErrorHandler from "./asyncErrorHandler.js";
import Auction from "../models/auctionSchema.js";
import { AUCTION_RUNTIME_STATUS, getAuctionTiming } from "../utils/auctionStatus.js";

const checkAuctionEndtime = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error("Invalid ID format");
        err.statusCode = 400;
        return next(err);
    }
    const auctionItem = await Auction.findById(id);
    if (!auctionItem) {
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    const timing = getAuctionTiming(auctionItem);
    if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID) {
        const err = new Error("Auction has an invalid schedule");
        err.statusCode = 400;
        return next(err);
    }
    if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.UPCOMING){
        const err = new Error("Auction is not started yet");
        err.statusCode = 400;
        return next(err);
    }
    if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED) {
        const err = new Error("Auction has ended");
        err.statusCode = 400;
        return next(err);
    }
    next();
})

export default checkAuctionEndtime;
