import User from "../models/userSchema.js";
import Bid from "../models/bidSchema.js";
import WalletTransaction from "../models/walletTransactionSchema.js";
import {
    applySession,
    createOne,
    runWithOptionalTransaction,
} from "./mongoTransaction.js";

export const WALLET_PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card"];

export const getWalletSnapshot = (user) => ({
    availableBalance: Number(user?.wallet?.availableBalance || 0),
    lockedBalance: Number(user?.wallet?.lockedBalance || 0),
    lifetimeDeposited: Number(user?.wallet?.lifetimeDeposited || 0),
    lifetimeWithdrawn: Number(user?.wallet?.lifetimeWithdrawn || 0),
});

export const calculateBidLockDelta = (targetLockedAmount, currentLockedAmount = 0) => {
    const target = Number(targetLockedAmount || 0);
    const current = Number(currentLockedAmount || 0);
    return {
        target,
        current,
        delta: Math.max(target - current, 0),
        release: Math.max(current - target, 0),
    };
};

export const canCoverBidLock = (user, targetLockedAmount, currentLockedAmount = 0) => {
    const wallet = getWalletSnapshot(user);
    const { delta } = calculateBidLockDelta(targetLockedAmount, currentLockedAmount);
    return wallet.availableBalance >= delta;
};

export const normalizeCommissionAmount = (commissionAmount, grossAmount) => {
    const gross = Number(grossAmount || 0);
    const rawCommission = Number(commissionAmount || 0);
    if (!Number.isFinite(gross) || gross <= 0 || !Number.isFinite(rawCommission)) {
        return 0;
    }
    return Math.min(Math.max(rawCommission, 0), gross);
};

const createTransaction = async ({
    user,
    type,
    amount,
    before,
    after,
    status = "Completed",
    auction,
    bid,
    withdrawal,
    paymentMethod = "Wallet",
    idempotencyKey,
    reference,
    note,
    session,
}) => {
    const lookup = buildWalletTransactionLookup({
        user,
        type,
        auction,
        withdrawal,
        idempotencyKey,
    });
    if (lookup) {
        const existing = await applySession(
            WalletTransaction.findOne(lookup),
            session
        );
        if (existing) return existing;
    }

    try {
        return await createOne(WalletTransaction, {
            user,
            type,
            amount,
            availableBefore: before.availableBalance,
            availableAfter: after.availableBalance,
            lockedBefore: before.lockedBalance,
            lockedAfter: after.lockedBalance,
            status,
            auction,
            bid,
            withdrawal,
            paymentMethod,
            ...(idempotencyKey ? { idempotencyKey } : {}),
            reference,
            note,
        }, session);
    } catch (error) {
        if (error?.code === 11000 && lookup) {
            const existing = await applySession(
                WalletTransaction.findOne(lookup),
                session
            );
            if (existing) return existing;
        }
        throw error;
    }
};

export const recordWalletTransaction = createTransaction;

export const settlementWalletTransactionTypes = [
    "BID_CAPTURED",
    "SALE_CREDIT",
    "ESCROW_REFUND",
    "COMMISSION_RETAINED",
];

export const buildWalletTransactionLookup = ({
    user,
    type,
    auction,
    withdrawal,
    idempotencyKey,
}) => {
    if (idempotencyKey) {
        return { user, type, idempotencyKey };
    }
    if (type === "BID_CAPTURED" && auction) {
        return { auction, type };
    }
    if (settlementWalletTransactionTypes.includes(type) && auction && user) {
        return { user, auction, type };
    }
    if (
        ["WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED"].includes(type) &&
        withdrawal
    ) {
        return { withdrawal, type };
    }
    return null;
};

export const findWalletTransaction = (lookup, session) =>
    lookup ? applySession(WalletTransaction.findOne(lookup), session) : null;

export const ensureWalletCanCoverBid = async (
    userId,
    targetLockedAmount,
    currentLockedAmount = 0,
    session
) => {
    const user = await applySession(User.findById(userId), session);
    if (!user || !canCoverBidLock(user, targetLockedAmount, currentLockedAmount)) {
        const { delta } = calculateBidLockDelta(targetLockedAmount, currentLockedAmount);
        const err = new Error(
            `Insufficient wallet balance. Add at least ${delta} more to place this bid.`
        );
        err.statusCode = 400;
        throw err;
    }
    return user;
};

export const lockBidFunds = async (params) => {
    const {
        userId,
        auctionId,
        bidId,
        targetLockedAmount,
        currentLockedAmount = 0,
        note,
        session,
        useTransaction = true,
    } = params;
    if (useTransaction && !session) {
        return runWithOptionalTransaction(({ session: transactionSession }) =>
            lockBidFunds({
                ...params,
                session: transactionSession,
                useTransaction: false,
            })
        );
    }

    const { delta } = calculateBidLockDelta(targetLockedAmount, currentLockedAmount);
    if (delta <= 0) return null;

    const beforeUser = await ensureWalletCanCoverBid(
        userId,
        targetLockedAmount,
        currentLockedAmount,
        session
    );
    const before = getWalletSnapshot(beforeUser);

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            "wallet.availableBalance": { $gte: delta },
        },
        {
            $inc: {
                "wallet.availableBalance": -delta,
                "wallet.lockedBalance": delta,
            },
        },
        { new: true, session }
    );

    if (!updatedUser) {
        const err = new Error("Insufficient wallet balance for this bid");
        err.statusCode = 400;
        throw err;
    }

    return createTransaction({
        user: userId,
        type: "BID_LOCK",
        amount: delta,
        before,
        after: getWalletSnapshot(updatedUser),
        auction: auctionId,
        bid: bidId,
        note,
        session,
    });
};

export const releaseBidFunds = async (params) => {
    const {
        userId,
        auctionId,
        bidId,
        amount,
        note,
        session,
        useTransaction = true,
    } = params;
    if (useTransaction && !session) {
        return runWithOptionalTransaction(({ session: transactionSession }) =>
            releaseBidFunds({
                ...params,
                session: transactionSession,
                useTransaction: false,
            })
        );
    }

    const releaseAmount = Number(amount || 0);
    if (!Number.isFinite(releaseAmount) || releaseAmount <= 0) return null;

    const beforeUser = await applySession(User.findById(userId), session);
    if (!beforeUser) return null;
    const before = getWalletSnapshot(beforeUser);
    const safeReleaseAmount = Math.min(releaseAmount, before.lockedBalance);
    if (safeReleaseAmount <= 0) return null;

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            "wallet.lockedBalance": { $gte: safeReleaseAmount },
        },
        {
            $inc: {
                "wallet.availableBalance": safeReleaseAmount,
                "wallet.lockedBalance": -safeReleaseAmount,
            },
        },
        { new: true, session }
    );

    if (!updatedUser) return null;

    return createTransaction({
        user: userId,
        type: "BID_RELEASE",
        amount: safeReleaseAmount,
        before,
        after: getWalletSnapshot(updatedUser),
        auction: auctionId,
        bid: bidId,
        note,
        session,
    });
};

export const releaseAuctionBidLocks = async (params) => {
    const {
        auction,
        exceptUserId,
        note = "Bid lock released after being outbid",
        session,
        useTransaction = true,
    } = params;
    if (useTransaction && !session) {
        return runWithOptionalTransaction(({ session: transactionSession }) =>
            releaseAuctionBidLocks({
                ...params,
                session: transactionSession,
                useTransaction: false,
            })
        );
    }

    const exceptId = exceptUserId?.toString?.();
    const releases = [];

    for (const bidEntry of auction?.bids || []) {
        const entryUserId = bidEntry.userId?.toString?.();
        if (!entryUserId || (exceptId && entryUserId === exceptId)) continue;

        const bidDoc = await applySession(
            Bid.findOne({
                "bidder.id": bidEntry.userId,
                auctionItem: auction._id,
            }),
            session
        );
        const lockedAmount = Number(
            bidDoc?.lockedAmount || bidEntry.lockedAmount || 0
        );

        if (lockedAmount <= 0) {
            bidEntry.lockedAmount = 0;
            if (bidDoc && Number(bidDoc.lockedAmount || 0) !== 0) {
                bidDoc.lockedAmount = 0;
                await bidDoc.save();
            }
            continue;
        }

        const release = await releaseBidFunds({
            userId: bidEntry.userId,
            auctionId: auction._id,
            bidId: bidDoc?._id,
            amount: lockedAmount,
            note,
            session,
        });
        if (release) releases.push(release);

        bidEntry.lockedAmount = 0;
        if (bidDoc) {
            bidDoc.lockedAmount = 0;
            await bidDoc.save({ session });
        }
    }

    return releases;
};

export const captureWinningBidFunds = async (params) => {
    const {
        bidderId,
        auctionId,
        bidId,
        grossAmount,
        commissionAmount = 0,
        session,
        useTransaction = true,
    } = params;
    if (useTransaction && !session) {
        return runWithOptionalTransaction(({ session: transactionSession }) =>
            captureWinningBidFunds({
                ...params,
                session: transactionSession,
                useTransaction: false,
            })
        );
    }

    const gross = Number(grossAmount || 0);
    const commission = normalizeCommissionAmount(commissionAmount, gross);
    const sellerCredit = Math.max(gross - commission, 0);
    if (!Number.isFinite(gross) || gross <= 0) {
        return { settled: false, reason: "Invalid winning amount" };
    }

    const existingCapture = await findWalletTransaction(
        buildWalletTransactionLookup({
            type: "BID_CAPTURED",
            auction: auctionId,
        }),
        session
    );
    if (existingCapture) {
        return {
            settled: true,
            captured: true,
            alreadyCaptured: true,
            grossAmount: Number(existingCapture.amount || gross),
            commissionAmount: commission,
            sellerCredit,
            settlementStatus: "HeldInEscrow",
        };
    }

    const winningBid = bidId ? await applySession(Bid.findById(bidId), session) : null;
    const winningBidLockedAmount = Number(winningBid?.lockedAmount || 0);
    if (!winningBid || winningBidLockedAmount < gross) {
        return { settled: false, reason: "Winning bid was not wallet locked" };
    }

    const bidderBeforeUser = await applySession(User.findById(bidderId), session);
    if (!bidderBeforeUser) return { settled: false, reason: "Bidder not found" };
    const bidderBefore = getWalletSnapshot(bidderBeforeUser);
    if (bidderBefore.lockedBalance < gross) {
        return { settled: false, reason: "Winning bid was not wallet locked" };
    }

    const bidderAfterUser = await User.findOneAndUpdate(
        {
            _id: bidderId,
            "wallet.lockedBalance": { $gte: gross },
        },
        {
            $inc: {
                "wallet.lockedBalance": -gross,
            },
        },
        { new: true, session }
    );

    if (!bidderAfterUser) {
        return { settled: false, reason: "Winning locked funds are unavailable" };
    }

    await createTransaction({
        user: bidderId,
        type: "BID_CAPTURED",
        amount: gross,
        before: bidderBefore,
        after: getWalletSnapshot(bidderAfterUser),
        auction: auctionId,
        bid: bidId,
        note: "Winning bid captured into escrow after auction close",
        session,
    });

    const unusedLockedAmount = Math.max(winningBidLockedAmount - gross, 0);
    if (unusedLockedAmount > 0) {
        await releaseBidFunds({
            userId: bidderId,
            auctionId,
            bidId,
            amount: unusedLockedAmount,
            note: "Unused winning bid lock released after settlement",
            session,
        });
    }
    winningBid.lockedAmount = 0;
    await winningBid.save({ session });

    return {
        settled: true,
        captured: true,
        grossAmount: gross,
        commissionAmount: commission,
        sellerCredit,
        settlementStatus: "HeldInEscrow",
    };
};
