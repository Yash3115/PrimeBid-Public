import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "TOP_UP",
                "BID_LOCK",
                "BID_RELEASE",
                "BID_CAPTURED",
                "ESCROW_REFUND",
                "SALE_CREDIT",
                "COMMISSION_DEBIT",
                "COMMISSION_RETAINED",
                "WITHDRAWAL_REQUEST",
                "WITHDRAWAL_APPROVED",
                "WITHDRAWAL_REJECTED",
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        availableBefore: {
            type: Number,
            default: 0,
        },
        availableAfter: {
            type: Number,
            default: 0,
        },
        lockedBefore: {
            type: Number,
            default: 0,
        },
        lockedAfter: {
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
        withdrawal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WithdrawalRequest",
        },
        paymentMethod: {
            type: String,
            enum: ["UPI", "Credit Card", "Debit Card", "Bank Transfer", "Manual", "Wallet"],
        },
        reference: String,
        note: String,
    },
    { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ auction: 1, type: 1 });
walletTransactionSchema.index({ withdrawal: 1 });

const WalletTransaction = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);

export default WalletTransaction;
