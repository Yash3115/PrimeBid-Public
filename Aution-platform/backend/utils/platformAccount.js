import PlatformAccount from "../models/platformAccountSchema.js";
import PlatformTransaction from "../models/platformTransactionSchema.js";

const PLATFORM_ACCOUNT_KEY = "primary";

export const getPlatformSnapshot = (account) => ({
    availableBalance: Number(account?.availableBalance || 0),
    lifetimeCommission: Number(account?.lifetimeCommission || 0),
    lifetimeManualCommission: Number(account?.lifetimeManualCommission || 0),
    lifetimeWithdrawn: Number(account?.lifetimeWithdrawn || 0),
});

export const getOrCreatePlatformAccount = async () =>
    PlatformAccount.findOneAndUpdate(
        { key: PLATFORM_ACCOUNT_KEY },
        { $setOnInsert: { key: PLATFORM_ACCOUNT_KEY } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

const buildCommissionLookup = ({ auctionId, bidId, paymentProofId, manual }) => {
    if (manual && paymentProofId) {
        return {
            type: "MANUAL_COMMISSION_CREDIT",
            paymentProof: paymentProofId,
        };
    }
    if (!manual && auctionId) {
        return {
            type: "COMMISSION_CREDIT",
            auction: auctionId,
        };
    }
    return null;
};

const findExistingCommissionCredit = async (settlementKey) => {
    if (!settlementKey) return null;
    const transaction = await PlatformTransaction.findOne(settlementKey);
    if (!transaction) return null;
    const account = await PlatformAccount.findById(transaction.platformAccount);

    return {
        account,
        transaction,
        before: {
            availableBalance: Number(transaction.balanceBefore || 0),
            lifetimeCommission: Number(account?.lifetimeCommission || 0),
            lifetimeManualCommission: Number(account?.lifetimeManualCommission || 0),
            lifetimeWithdrawn: Number(account?.lifetimeWithdrawn || 0),
        },
        after: getPlatformSnapshot(account),
        alreadyCredited: true,
    };
};

export const creditPlatformCommission = async ({
    amount,
    auctionId,
    bidId,
    bidderId,
    auctioneerId,
    paymentProofId,
    manual = false,
    reference,
    note,
}) => {
    const commissionAmount = Number(amount || 0);
    if (!Number.isFinite(commissionAmount) || commissionAmount <= 0) {
        return null;
    }

    const settlementKey = buildCommissionLookup({
        auctionId,
        bidId,
        paymentProofId,
        manual,
    });
    const existingSettlement = await findExistingCommissionCredit(settlementKey);
    if (existingSettlement) {
        return existingSettlement;
    }

    const beforeAccount = await getOrCreatePlatformAccount();
    const before = getPlatformSnapshot(beforeAccount);
    const updatedAccount = await PlatformAccount.findByIdAndUpdate(
        beforeAccount._id,
        {
            $inc: {
                availableBalance: commissionAmount,
                lifetimeCommission: commissionAmount,
                lifetimeManualCommission: manual ? commissionAmount : 0,
            },
        },
        { new: true }
    );

    let transaction;
    try {
        transaction = await PlatformTransaction.create({
            platformAccount: updatedAccount._id,
            type: manual ? "MANUAL_COMMISSION_CREDIT" : "COMMISSION_CREDIT",
            amount: commissionAmount,
            balanceBefore: before.availableBalance,
            balanceAfter: getPlatformSnapshot(updatedAccount).availableBalance,
            auction: auctionId,
            bid: bidId,
            bidder: bidderId,
            auctioneer: auctioneerId,
            paymentProof: paymentProofId,
            reference,
            note: note || "Platform commission credited",
        });
    } catch (error) {
        await PlatformAccount.findByIdAndUpdate(updatedAccount._id, {
            $inc: {
                availableBalance: -commissionAmount,
                lifetimeCommission: -commissionAmount,
                lifetimeManualCommission: manual ? -commissionAmount : 0,
            },
        });
        if (error?.code === 11000) {
            const duplicateSettlement = await findExistingCommissionCredit(settlementKey);
            if (duplicateSettlement) return duplicateSettlement;
        }
        throw error;
    }

    return {
        account: updatedAccount,
        transaction,
        before,
        after: getPlatformSnapshot(updatedAccount),
    };
};
