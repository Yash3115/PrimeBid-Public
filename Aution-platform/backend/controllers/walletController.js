import mongoose from "mongoose";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Bid from "../models/bidSchema.js";
import User from "../models/userSchema.js";
import WalletTransaction from "../models/walletTransactionSchema.js";
import WithdrawalRequest from "../models/withdrawalRequestSchema.js";
import AuditLog from "../models/auditLogSchema.js";
import { createNotification } from "../utils/notifications.js";
import { getAuctionTiming } from "../utils/auctionStatus.js";
import {
    buildWithdrawalBankSnapshot,
    getBankDetailsValidationMessage,
    getBankTransferDetails,
    validateBankTransferDetails,
} from "../utils/bankDetails.js";
import { buildWalletLockBreakdown } from "../utils/walletBreakdown.js";
import {
    WALLET_PAYMENT_METHODS,
    getWalletSnapshot,
    recordWalletTransaction,
} from "../utils/wallet.js";

const MAX_WALLET_AMOUNT = 10000000;

const parseWalletAmount = (value, label = "Amount") => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        const err = new Error(`${label} must be a positive number`);
        err.statusCode = 400;
        throw err;
    }
    if (amount > MAX_WALLET_AMOUNT) {
        const err = new Error(`${label} is above the allowed wallet limit`);
        err.statusCode = 400;
        throw err;
    }
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount <= 0) {
        const err = new Error(`${label} must be at least 0.01`);
        err.statusCode = 400;
        throw err;
    }
    return roundedAmount;
};

const cleanText = (value, maxLength = 120) =>
    String(value || "").trim().slice(0, maxLength);

const buildBidLockDetails = async (userId) => {
    const bidLocks = await Bid.find({
        "bidder.id": userId,
        lockedAmount: { $gt: 0 },
    })
        .populate(
            "auctionItem",
            "title image currentBid status startTime endTime minimumBidIncrement category"
        )
        .sort({ updatedAt: -1 })
        .limit(50);

    return bidLocks.map((bid) => {
        const auction = bid.auctionItem;
        const timing = auction ? getAuctionTiming(auction) : null;

        return {
            type: "bid",
            bidId: bid._id,
            auctionId: auction?._id || bid.auctionItem,
            title: auction?.title || "Auction unavailable",
            image: auction?.image,
            category: auction?.category,
            amount: Number(bid.lockedAmount || 0),
            bidAmount: Number(bid.amount || 0),
            currentBid: Number(auction?.currentBid || bid.amount || 0),
            isAutoBid: Boolean(bid.isAutoBid),
            runtimeStatus: timing?.runtimeStatus || "Unavailable",
            endsAt: timing?.endsAt || auction?.endTime || null,
            nextMinimumBid:
                Number(auction?.currentBid || 0) +
                Number(auction?.minimumBidIncrement || 1),
            updatedAt: bid.updatedAt,
        };
    });
};

const buildWithdrawalLockDetails = (withdrawals = []) =>
    withdrawals
        .filter((withdrawal) => withdrawal.status === "Pending")
        .map((withdrawal) => ({
            type: "withdrawal",
            withdrawalId: withdrawal._id,
            amount: Number(withdrawal.amount || 0),
            status: withdrawal.status,
            bankName: withdrawal.bankDetailsSnapshot?.bankName,
            bankAccountName: withdrawal.bankDetailsSnapshot?.bankAccountName,
            createdAt: withdrawal.createdAt,
        }));

const buildWalletPayload = async (userId) => {
    const user = await User.findById(userId).select("-password");
    const [transactions, withdrawals, bidLocks] = await Promise.all([
        WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(40),
        WithdrawalRequest.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
        buildBidLockDetails(userId),
    ]);
    const wallet = getWalletSnapshot(user);
    const withdrawalLocks = buildWithdrawalLockDetails(withdrawals);

    return {
        wallet,
        lockBreakdown: buildWalletLockBreakdown({
            wallet,
            bidLocks,
            withdrawalLocks,
        }),
        transactions,
        withdrawals,
        bankTransfer: getBankTransferDetails(user),
        kycStatus: user?.kycStatus,
    };
};

const getWallet = asyncErrorHandler(async (req, res) => {
    const payload = await buildWalletPayload(req.user._id);
    return res.status(200).json({
        success: true,
        ...payload,
    });
});

const topUpWallet = asyncErrorHandler(async (req, res, next) => {
    const amount = parseWalletAmount(req.body.amount, "Top-up amount");
    const paymentMethod = cleanText(req.body.paymentMethod || req.body.method);
    const reference = cleanText(req.body.reference, 160);

    if (!WALLET_PAYMENT_METHODS.includes(paymentMethod)) {
        const err = new Error("Please choose UPI, Credit Card, or Debit Card");
        err.statusCode = 400;
        return next(err);
    }

    const beforeUser = await User.findById(req.user._id);
    if (!beforeUser) {
        const err = new Error("User not found");
        err.statusCode = 404;
        return next(err);
    }
    const before = getWalletSnapshot(beforeUser);
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $inc: {
                "wallet.availableBalance": amount,
                "wallet.lifetimeDeposited": amount,
            },
        },
        { new: true }
    );

    const transaction = await recordWalletTransaction({
        user: req.user._id,
        type: "TOP_UP",
        amount,
        before,
        after: getWalletSnapshot(updatedUser),
        paymentMethod,
        reference,
        note: "Demo wallet top-up credited immediately",
    });
    const payload = await buildWalletPayload(req.user._id);

    return res.status(201).json({
        success: true,
        message: "Wallet topped up successfully",
        transaction,
        ...payload,
    });
});

const requestWithdrawal = asyncErrorHandler(async (req, res, next) => {
    const amount = parseWalletAmount(req.body.amount, "Withdrawal amount");
    const user = await User.findById(req.user._id);
    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        return next(err);
    }
    if (user.kycStatus !== "Approved") {
        const err = new Error("KYC approval is required before withdrawals");
        err.statusCode = 403;
        return next(err);
    }

    const bankDetailsSnapshot = buildWithdrawalBankSnapshot({
        savedBankDetails: getBankTransferDetails(user),
        requestBody: req.body,
    });
    const bankValidation = validateBankTransferDetails(bankDetailsSnapshot);
    if (!bankValidation.valid) {
        const err = new Error(
            getBankDetailsValidationMessage(bankValidation.errors)
        );
        err.statusCode = 400;
        return next(err);
    }

    const before = getWalletSnapshot(user);
    const updatedUser = await User.findOneAndUpdate(
        {
            _id: user._id,
            "wallet.availableBalance": { $gte: amount },
        },
        {
            $inc: {
                "wallet.availableBalance": -amount,
                "wallet.lockedBalance": amount,
            },
        },
        { new: true }
    );

    if (!updatedUser) {
        const err = new Error("Insufficient available wallet balance for withdrawal");
        err.statusCode = 400;
        return next(err);
    }

    try {
        const withdrawal = await WithdrawalRequest.create({
            user: user._id,
            amount,
            bankDetailsSnapshot: bankValidation.details,
        });

        const transaction = await recordWalletTransaction({
            user: user._id,
            type: "WITHDRAWAL_REQUEST",
            amount,
            before,
            after: getWalletSnapshot(updatedUser),
            status: "Pending",
            withdrawal: withdrawal._id,
            paymentMethod: "Bank Transfer",
            note: "Withdrawal requested and reserved from available balance",
        });

        const payload = await buildWalletPayload(user._id);
        return res.status(201).json({
            success: true,
            message: "Withdrawal request submitted",
            withdrawal,
            transaction,
            ...payload,
        });
    } catch (error) {
        await User.findByIdAndUpdate(user._id, {
            $inc: {
                "wallet.availableBalance": amount,
                "wallet.lockedBalance": -amount,
            },
        });
        throw error;
    }
});

const getMyWithdrawals = asyncErrorHandler(async (req, res) => {
    const withdrawals = await WithdrawalRequest.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
    return res.status(200).json({
        success: true,
        withdrawals,
    });
});

const fetchWithdrawalRequests = asyncErrorHandler(async (req, res) => {
    const { status = "Pending" } = req.query;
    const query = {};
    if (["Pending", "Approved", "Rejected"].includes(status)) {
        query.status = status;
    }

    const withdrawals = await WithdrawalRequest.find(query)
        .populate("user", "userName email role wallet kycStatus")
        .sort({ createdAt: -1 })
        .limit(200);

    return res.status(200).json({
        success: true,
        withdrawals,
    });
});

const reviewWithdrawalRequest = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const status = cleanText(req.body.status);
    const adminComment = cleanText(req.body.adminComment, 500);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error("Invalid withdrawal request ID");
        err.statusCode = 400;
        return next(err);
    }
    if (!["Approved", "Rejected"].includes(status)) {
        const err = new Error("Withdrawal status must be Approved or Rejected");
        err.statusCode = 400;
        return next(err);
    }

    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) {
        const err = new Error("Withdrawal request not found");
        err.statusCode = 404;
        return next(err);
    }
    if (withdrawal.status !== "Pending") {
        const err = new Error("Only pending withdrawal requests can be reviewed");
        err.statusCode = 400;
        return next(err);
    }

    const user = await User.findById(withdrawal.user);
    if (!user) {
        const err = new Error("Withdrawal user not found");
        err.statusCode = 404;
        return next(err);
    }

    const amount = Number(withdrawal.amount || 0);
    const before = getWalletSnapshot(user);
    const update =
        status === "Approved"
            ? {
                  $inc: {
                      "wallet.lockedBalance": -amount,
                      "wallet.lifetimeWithdrawn": amount,
                  },
              }
            : {
                  $inc: {
                      "wallet.availableBalance": amount,
                      "wallet.lockedBalance": -amount,
                  },
              };

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: user._id,
            "wallet.lockedBalance": { $gte: amount },
        },
        update,
        { new: true }
    );

    if (!updatedUser) {
        const err = new Error("Reserved withdrawal funds are unavailable");
        err.statusCode = 409;
        return next(err);
    }

    withdrawal.status = status;
    withdrawal.adminComment = adminComment;
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    const transaction = await recordWalletTransaction({
        user: user._id,
        type: status === "Approved" ? "WITHDRAWAL_APPROVED" : "WITHDRAWAL_REJECTED",
        amount,
        before,
        after: getWalletSnapshot(updatedUser),
        withdrawal: withdrawal._id,
        paymentMethod: "Bank Transfer",
        note:
            status === "Approved"
                ? "Withdrawal approved by admin"
                : "Withdrawal rejected and funds returned",
    });

    await AuditLog.create({
        actor: req.user._id,
        action: "WITHDRAWAL_REVIEWED",
        targetType: "WithdrawalRequest",
        targetId: withdrawal._id,
        summary: `${status} withdrawal for ${user.email}`,
    });
    await createNotification({
        user: user._id,
        type: "wallet",
        title: `Withdrawal ${status}`,
        message:
            status === "Approved"
                ? "Your withdrawal request has been approved."
                : "Your withdrawal request was rejected and the funds were returned to your wallet.",
    });

    const withdrawals = await WithdrawalRequest.find({ status: "Pending" })
        .populate("user", "userName email role wallet kycStatus")
        .sort({ createdAt: -1 })
        .limit(200);

    return res.status(200).json({
        success: true,
        message: `Withdrawal ${status.toLowerCase()}`,
        withdrawal,
        transaction,
        withdrawals,
    });
});

export {
    getWallet,
    topUpWallet,
    requestWithdrawal,
    getMyWithdrawals,
    fetchWithdrawalRequests,
    reviewWithdrawalRequest,
};
