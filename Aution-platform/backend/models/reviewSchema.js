import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";
import { createScopedModel } from "./plugins/createScopedModel.js";

const reviewSchema = new mongoose.Schema(
    {
        auction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction",
            required: true,
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 600,
        },
    },
    { timestamps: true }
);

reviewSchema.plugin(demoScopedModel);

reviewSchema.index({ auction: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ seller: 1, createdAt: -1 });

const Review = createScopedModel("Review", reviewSchema);

export default Review;
