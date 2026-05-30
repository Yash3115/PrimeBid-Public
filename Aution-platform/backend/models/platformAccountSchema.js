import mongoose from "mongoose";

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

const PlatformAccount = mongoose.model(
    "PlatformAccount",
    platformAccountSchema
);

export default PlatformAccount;
