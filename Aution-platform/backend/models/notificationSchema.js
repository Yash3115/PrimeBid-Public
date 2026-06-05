import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        auction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction",
        },
        type: {
            type: String,
            enum: [
                "outbid",
                "ending_soon",
                "auction_won",
                "auction_ended",
                "auction_extended",
                "fulfillment",
                "wallet",
                "admin",
            ],
            default: "admin",
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
        actionPath: String,
        dedupeKey: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

notificationSchema.plugin(demoScopedModel);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ auction: 1, type: 1, user: 1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
