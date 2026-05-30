import mongoose from "mongoose";
import Auction from "../models/auctionSchema.js";

const calculateCommission = async (auctionId) => {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      const err = new Error("Invalid Auction Id format");
      err.statusCode = 400;
      throw err;
    }
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      const err = new Error("Auction not found");
      err.statusCode = 404;
      throw err;
    }
    const commissionRate = 0.05;
    const commission = Number(auction.currentBid || 0) * commissionRate;
    return commission;
  };

export { calculateCommission };
