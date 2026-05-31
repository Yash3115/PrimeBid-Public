import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        bankDetailsSnapshot: {
            bankAccountNumber: String,
            bankAccountName: String,
            bankIFSCCode: String,
            bankName: String,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        adminComment: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: Date,
        idempotencyKey: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

withdrawalRequestSchema.index({ user: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });
withdrawalRequestSchema.index(
    { user: 1, idempotencyKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            idempotencyKey: { $type: "string" },
        },
    }
);

const WithdrawalRequest = mongoose.model(
    "WithdrawalRequest",
    withdrawalRequestSchema
);

export default WithdrawalRequest;
