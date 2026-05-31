import Commission from "../models/commissionSchema.js";
import User from "../models/userSchema.js";
import {
  SETTLEMENT_STATUS,
  activeEscrowSettlementStatuses,
  buildTimelineEntry,
} from "./fulfillment.js";
import { creditPlatformCommission } from "./platformAccount.js";
import {
  buildWalletTransactionLookup,
  findWalletTransaction,
  getWalletSnapshot,
  normalizeCommissionAmount,
  recordWalletTransaction,
} from "./wallet.js";
import { applySession } from "./mongoTransaction.js";

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

const assertReleasableEscrow = (fulfillment, desiredAction) => {
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found");
    err.statusCode = 404;
    throw err;
  }
  if (fulfillment.settlementStatus === SETTLEMENT_STATUS.RELEASED_TO_SELLER) {
    if (desiredAction === "release") {
      return { alreadySettled: true, action: "released" };
    }
    const err = new Error("Escrow was already released to the seller");
    err.statusCode = 409;
    throw err;
  }
  if (fulfillment.settlementStatus === SETTLEMENT_STATUS.REFUNDED_TO_BUYER) {
    if (desiredAction === "refund") {
      return { alreadySettled: true, action: "refunded" };
    }
    const err = new Error("Escrow was already refunded to the buyer");
    err.statusCode = 409;
    throw err;
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
  session,
}) => {
  const workingFulfillment = fulfillment;
  const guard = assertReleasableEscrow(workingFulfillment, "release");
  if (guard.alreadySettled) {
    return { success: true, alreadySettled: true, fulfillment: workingFulfillment };
  }

  const amounts = getSettlementAmounts(workingFulfillment);
  if (amounts.escrowAmount <= 0) {
    const err = new Error("Escrow amount is invalid");
    err.statusCode = 409;
    throw err;
  }

  const auctionId = workingFulfillment.auction?._id || workingFulfillment.auction;
  const bidId = workingFulfillment.winningBid?._id || workingFulfillment.winningBid;
  const sellerId = workingFulfillment.seller?._id || workingFulfillment.seller;
  const bidderId = workingFulfillment.bidder?._id || workingFulfillment.bidder;
  const [sellerBeforeUser, bidder] = await Promise.all([
    applySession(User.findById(sellerId), session),
    applySession(User.findById(bidderId), session),
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
      session,
    });
  }

  let sellerAfterUser = sellerBeforeUser;
  if (amounts.sellerPayoutAmount > 0) {
    const saleCreditLookup = buildWalletTransactionLookup({
      user: sellerId,
      type: "SALE_CREDIT",
      auction: auctionId,
    });
    const existingSaleCredit = await findWalletTransaction(saleCreditLookup, session);
    const sellerBefore = getWalletSnapshot(sellerBeforeUser);
    if (!existingSaleCredit) {
      sellerAfterUser = await User.findByIdAndUpdate(
        sellerId,
        {
          $inc: {
            "wallet.availableBalance": amounts.sellerPayoutAmount,
          },
        },
        { new: true, session }
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
        session,
      });
    }
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
      { upsert: true, new: true, setDefaultsOnInsert: true, session }
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
      session,
    });
  }

  workingFulfillment.settlementStatus = SETTLEMENT_STATUS.RELEASED_TO_SELLER;
  workingFulfillment.settlement = {
    ...(workingFulfillment.settlement?.toObject?.() || workingFulfillment.settlement || {}),
    ...amounts,
    releasedAt: new Date(),
    reviewedBy: actor,
    platformTransaction: platformSettlement?.transaction?._id,
    commission: commissionRecord?._id,
    note,
  };
  workingFulfillment.timeline.push(
    buildTimelineEntry({
      status: workingFulfillment.status,
      title: "Escrow released",
      message: note,
      actor,
      actorRole,
    })
  );
  await workingFulfillment.save({ session });

  if (bidder) {
    await User.findByIdAndUpdate(bidder._id, {
      $inc: { "buyerStats.completedPurchases": 1 },
    });
  }

  return {
    success: true,
    fulfillment: workingFulfillment,
    amounts,
    platformSettlement,
  };
};

export const refundEscrowToBuyer = async ({
  fulfillment,
  actor,
  actorRole = "System",
  note = "Escrow refunded to buyer",
  session,
}) => {
  const workingFulfillment = fulfillment;
  const guard = assertReleasableEscrow(workingFulfillment, "refund");
  if (guard.alreadySettled) {
    return { success: true, alreadySettled: true, fulfillment: workingFulfillment };
  }

  const amounts = getSettlementAmounts(workingFulfillment);
  if (amounts.escrowAmount <= 0) {
    const err = new Error("Escrow amount is invalid");
    err.statusCode = 409;
    throw err;
  }

  const auctionId = workingFulfillment.auction?._id || workingFulfillment.auction;
  const bidId = workingFulfillment.winningBid?._id || workingFulfillment.winningBid;
  const bidderId = workingFulfillment.bidder?._id || workingFulfillment.bidder;
  const buyerBeforeUser = await applySession(User.findById(bidderId), session);
  if (!buyerBeforeUser) {
    const err = new Error("Buyer account not found");
    err.statusCode = 404;
    throw err;
  }

  const refundLookup = buildWalletTransactionLookup({
    user: bidderId,
    type: "ESCROW_REFUND",
    auction: auctionId,
  });
  const existingRefund = await findWalletTransaction(refundLookup, session);
  const before = getWalletSnapshot(buyerBeforeUser);
  let buyerAfterUser = buyerBeforeUser;
  if (!existingRefund) {
    buyerAfterUser = await User.findByIdAndUpdate(
      bidderId,
      {
        $inc: {
          "wallet.availableBalance": amounts.escrowAmount,
        },
      },
      { new: true, session }
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
      session,
    });
  }

  workingFulfillment.settlementStatus = SETTLEMENT_STATUS.REFUNDED_TO_BUYER;
  workingFulfillment.settlement = {
    ...(workingFulfillment.settlement?.toObject?.() || workingFulfillment.settlement || {}),
    ...amounts,
    refundedAt: new Date(),
    reviewedBy: actor,
    note,
  };
  workingFulfillment.timeline.push(
    buildTimelineEntry({
      status: workingFulfillment.status,
      title: "Escrow refunded",
      message: note,
      actor,
      actorRole,
    })
  );
  await workingFulfillment.save({ session });

  return {
    success: true,
    fulfillment: workingFulfillment,
    amounts,
  };
};
