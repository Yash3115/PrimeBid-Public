import Commission from "../models/commissionSchema.js";
import User from "../models/userSchema.js";
import {
  SETTLEMENT_STATUS,
  activeEscrowSettlementStatuses,
  buildTimelineEntry,
} from "./fulfillment.js";
import { creditPlatformCommission } from "./platformAccount.js";
import {
  getWalletSnapshot,
  normalizeCommissionAmount,
  recordWalletTransaction,
} from "./wallet.js";

const roundMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number * 100) / 100;
};

export const buildEscrowSettlement = ({
  grossAmount,
  commissionAmount = 0,
  capturedAt = new Date(),
} = {}) => {
  const escrowAmount = roundMoney(grossAmount);
  const commission = normalizeCommissionAmount(commissionAmount, escrowAmount);
  return {
    escrowAmount,
    commissionAmount: commission,
    sellerPayoutAmount: roundMoney(Math.max(escrowAmount - commission, 0)),
    capturedAt,
  };
};

export const isActiveEscrowSettlement = (settlementStatus) =>
  activeEscrowSettlementStatuses.includes(settlementStatus);

const getSettlementAmounts = (fulfillment) => {
  const fallback = buildEscrowSettlement({
    grossAmount: fulfillment?.winningAmount,
    commissionAmount: fulfillment?.settlement?.commissionAmount,
  });
  const escrowAmount =
    roundMoney(fulfillment?.settlement?.escrowAmount) || fallback.escrowAmount;
  const commissionAmount = normalizeCommissionAmount(
    fulfillment?.settlement?.commissionAmount,
    escrowAmount
  );
  const sellerPayoutAmount =
    roundMoney(fulfillment?.settlement?.sellerPayoutAmount) ||
    roundMoney(Math.max(escrowAmount - commissionAmount, 0));

  return {
    escrowAmount,
    commissionAmount,
    sellerPayoutAmount,
  };
};

const assertReleasableEscrow = (fulfillment) => {
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found");
    err.statusCode = 404;
    throw err;
  }
  if (fulfillment.settlementStatus === SETTLEMENT_STATUS.RELEASED_TO_SELLER) {
    return { alreadySettled: true, action: "released" };
  }
  if (fulfillment.settlementStatus === SETTLEMENT_STATUS.REFUNDED_TO_BUYER) {
    return { alreadySettled: true, action: "refunded" };
  }
  if (!isActiveEscrowSettlement(fulfillment.settlementStatus)) {
    const err = new Error("Escrow is not available for this fulfillment");
    err.statusCode = 409;
    throw err;
  }
  return { alreadySettled: false };
};

export const releaseEscrowToSeller = async ({
  fulfillment,
  actor,
  actorRole = "System",
  note = "Escrow released to seller",
}) => {
  const guard = assertReleasableEscrow(fulfillment);
  if (guard.alreadySettled) {
    return { success: true, alreadySettled: true, fulfillment };
  }

  const amounts = getSettlementAmounts(fulfillment);
  if (amounts.escrowAmount <= 0) {
    const err = new Error("Escrow amount is invalid");
    err.statusCode = 409;
    throw err;
  }

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  const bidId = fulfillment.winningBid?._id || fulfillment.winningBid;
  const sellerId = fulfillment.seller?._id || fulfillment.seller;
  const bidderId = fulfillment.bidder?._id || fulfillment.bidder;
  const [sellerBeforeUser, bidder] = await Promise.all([
    User.findById(sellerId),
    User.findById(bidderId),
  ]);
  if (!sellerBeforeUser) {
    const err = new Error("Seller account not found");
    err.statusCode = 404;
    throw err;
  }

  let platformSettlement = null;
  let commissionRecord = null;
  if (amounts.commissionAmount > 0) {
    platformSettlement = await creditPlatformCommission({
      amount: amounts.commissionAmount,
      auctionId,
      bidId,
      bidderId,
      auctioneerId: sellerId,
      note: "Platform commission credited when escrow was released",
    });
  }

  let sellerAfterUser = sellerBeforeUser;
  if (amounts.sellerPayoutAmount > 0) {
    const sellerBefore = getWalletSnapshot(sellerBeforeUser);
    sellerAfterUser = await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: {
          "wallet.availableBalance": amounts.sellerPayoutAmount,
        },
      },
      { new: true }
    );

    await recordWalletTransaction({
      user: sellerId,
      type: "SALE_CREDIT",
      amount: amounts.sellerPayoutAmount,
      before: sellerBefore,
      after: getWalletSnapshot(sellerAfterUser),
      auction: auctionId,
      bid: bidId,
      note: "Escrow released after delivery confirmation or admin decision",
    });
  }

  if (amounts.commissionAmount > 0) {
    commissionRecord = await Commission.findOneAndUpdate(
      {
        auction: auctionId,
        collectionMethod: "WalletSettlement",
      },
      {
        amount: amounts.commissionAmount,
        user: sellerId,
        auctioneer: sellerId,
        bidder: bidderId,
        auction: auctionId,
        bid: bidId,
        platformAccount: platformSettlement?.account?._id,
        platformTransaction: platformSettlement?.transaction?._id,
        collectionMethod: "WalletSettlement",
        status: "Collected",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recordWalletTransaction({
      user: sellerId,
      type: "COMMISSION_RETAINED",
      amount: amounts.commissionAmount,
      before: getWalletSnapshot(sellerAfterUser),
      after: getWalletSnapshot(sellerAfterUser),
      auction: auctionId,
      bid: bidId,
      note: "Platform commission transferred when escrow was released",
    });
  }

  fulfillment.settlementStatus = SETTLEMENT_STATUS.RELEASED_TO_SELLER;
  fulfillment.settlement = {
    ...(fulfillment.settlement?.toObject?.() || fulfillment.settlement || {}),
    ...amounts,
    releasedAt: new Date(),
    reviewedBy: actor,
    platformTransaction: platformSettlement?.transaction?._id,
    commission: commissionRecord?._id,
    note,
  };
  fulfillment.timeline.push(
    buildTimelineEntry({
      status: fulfillment.status,
      title: "Escrow released",
      message: note,
      actor,
      actorRole,
    })
  );
  await fulfillment.save();

  if (bidder) {
    await User.findByIdAndUpdate(bidder._id, {
      $inc: { "buyerStats.completedPurchases": 1 },
    });
  }

  return {
    success: true,
    fulfillment,
    amounts,
    platformSettlement,
  };
};

export const refundEscrowToBuyer = async ({
  fulfillment,
  actor,
  actorRole = "System",
  note = "Escrow refunded to buyer",
}) => {
  const guard = assertReleasableEscrow(fulfillment);
  if (guard.alreadySettled) {
    return { success: true, alreadySettled: true, fulfillment };
  }

  const amounts = getSettlementAmounts(fulfillment);
  if (amounts.escrowAmount <= 0) {
    const err = new Error("Escrow amount is invalid");
    err.statusCode = 409;
    throw err;
  }

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  const bidId = fulfillment.winningBid?._id || fulfillment.winningBid;
  const bidderId = fulfillment.bidder?._id || fulfillment.bidder;
  const buyerBeforeUser = await User.findById(bidderId);
  if (!buyerBeforeUser) {
    const err = new Error("Buyer account not found");
    err.statusCode = 404;
    throw err;
  }

  const before = getWalletSnapshot(buyerBeforeUser);
  const buyerAfterUser = await User.findByIdAndUpdate(
    bidderId,
    {
      $inc: {
        "wallet.availableBalance": amounts.escrowAmount,
      },
    },
    { new: true }
  );

  await recordWalletTransaction({
    user: bidderId,
    type: "ESCROW_REFUND",
    amount: amounts.escrowAmount,
    before,
    after: getWalletSnapshot(buyerAfterUser),
    auction: auctionId,
    bid: bidId,
    note,
  });

  fulfillment.settlementStatus = SETTLEMENT_STATUS.REFUNDED_TO_BUYER;
  fulfillment.settlement = {
    ...(fulfillment.settlement?.toObject?.() || fulfillment.settlement || {}),
    ...amounts,
    refundedAt: new Date(),
    reviewedBy: actor,
    note,
  };
  fulfillment.timeline.push(
    buildTimelineEntry({
      status: fulfillment.status,
      title: "Escrow refunded",
      message: note,
      actor,
      actorRole,
    })
  );
  await fulfillment.save();

  return {
    success: true,
    fulfillment,
    amounts,
  };
};
