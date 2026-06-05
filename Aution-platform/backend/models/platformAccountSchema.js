import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";
import { createScopedModel } from "./plugins/createScopedModel.js";

const platformAccountSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "primary",
            unique: true,
            immutable: true,
        },
        availableBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeCommission: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeManualCommission: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeWithdrawn: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

platformAccountSchema.plugin(demoScopedModel);

const PlatformAccount = createScopedModel(
    "PlatformAccount",
    platformAccountSchema
);

export default PlatformAccount;
