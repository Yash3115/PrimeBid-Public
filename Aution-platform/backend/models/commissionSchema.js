import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const commissionschema = new mongoose.Schema({
    amount:{
        type: Number,
        required: true,
        min: 0,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    auctioneer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    bidder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    auction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auction",
    },
    bid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bid",
    },
    paymentProof: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Paymentproof",
    },
    platformAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlatformAccount",
    },
    platformTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlatformTransaction",
    },
    collectionMethod: {
        type: String,
        enum: ["WalletSettlement", "ManualProof"],
        default: "WalletSettlement",
    },
    status: {
        type: String,
        enum: ["Collected", "LegacySettled"],
        default: "Collected",
    },
    createdAt:{
        type: Date,
        default: Date.now,
    }
})

commissionschema.plugin(demoScopedModel);

commissionschema.index({ paymentProof: 1 }, { unique: true, sparse: true });
commissionschema.index({ auction: 1, createdAt: -1 });
commissionschema.index({ platformTransaction: 1 }, { unique: true, sparse: true });
commissionschema.index({ user: 1, createdAt: -1 });
commissionschema.index({ collectionMethod: 1, createdAt: -1 });

const Commission = new mongoose.model("Commission", commissionschema);

export default Commission;
