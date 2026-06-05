import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const platformTransactionSchema = new mongoose.Schema(
    {
        platformAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PlatformAccount",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "COMMISSION_CREDIT",
                "MANUAL_COMMISSION_CREDIT",
                "PLATFORM_WITHDRAWAL",
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        balanceBefore: {
            type: Number,
            default: 0,
        },
        balanceAfter: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed", "Cancelled"],
            default: "Completed",
        },
        auction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction",
        },
        bid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bid",
        },
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        auctioneer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        paymentProof: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Paymentproof",
        },
        reference: String,
        note: String,
    },
    { timestamps: true }
);

platformTransactionSchema.plugin(demoScopedModel);

platformTransactionSchema.index({ platformAccount: 1, createdAt: -1 });
platformTransactionSchema.index({ auction: 1, createdAt: -1 });
platformTransactionSchema.index({ paymentProof: 1, createdAt: -1 });
platformTransactionSchema.index(
    { auction: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            auction: { $exists: true },
            type: "COMMISSION_CREDIT",
        },
    }
);
platformTransactionSchema.index(
    { paymentProof: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            paymentProof: { $exists: true },
            type: "MANUAL_COMMISSION_CREDIT",
        },
    }
);

const PlatformTransaction = mongoose.model(
    "PlatformTransaction",
    platformTransactionSchema
);

export default PlatformTransaction;
