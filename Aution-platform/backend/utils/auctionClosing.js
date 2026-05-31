import Auction from "../models/auctionSchema.js";
import Bid from "../models/bidSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import User from "../models/userSchema.js";
import { buildEscrowSettlement } from "./escrowSettlement.js";
import {
  SETTLEMENT_STATUS,
  ensureFulfillmentForAuction,
} from "./fulfillment.js";
import { runWithOptionalTransaction } from "./mongoTransaction.js";
import { createNotification } from "./notifications.js";
import {
  buildAuctionSyncSnapshot,
  bumpAuctionBidVersion,
  publishAuctionEvent,
} from "./auctionRealtime.js";
import {
  captureWinningBidFunds,
  releaseAuctionBidLocks,
} from "./wallet.js";

export const AUCTION_CLOSURE_STATUS = Object.freeze({
  OPEN: "Open",
  PROCESSING: "Processing",
  CLOSED: "Closed",
  NEEDS_REVIEW: "NeedsReview",
  NO_WINNER: "NoWinner",
  FAILED: "Failed",
});

export const FINAL_AUCTION_CLOSURE_STATUSES = Object.freeze([
  AUCTION_CLOSURE_STATUS.CLOSED,
  AUCTION_CLOSURE_STATUS.NEEDS_REVIEW,
  AUCTION_CLOSURE_STATUS.NO_WINNER,
]);

const PROCESSING_STALE_MS = 2 * 60 * 1000;
const DEFAULT_CLOSE_LIMIT = 25;
const PLATFORM_COMMISSION_RATE = 0.05;

const toId = (value) =>
  value?._id?.toString?.() || value?.toString?.() || "";

const isEndedAt = (auction, now) => {
  const endMs = new Date(auction?.endTime).getTime();
  return Number.isFinite(endMs) && endMs <= now.getTime();
};

const money = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
};

export const calculatePlatformCommission = (winningAmount) =>
  money(winningAmount * PLATFORM_COMMISSION_RATE);

export const compareWinnerBids = (a = {}, b = {}) => {
  const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
  if (amountDiff !== 0) return amountDiff;

  const aCreated = new Date(a.createdAt || 0).getTime();
  const bCreated = new Date(b.createdAt || 0).getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;

  return toId(a._id).localeCompare(toId(b._id));
};

export const chooseWinningBidFromList = (bids = []) =>
  [...bids]
    .filter((bid) => bid?.bidder?.id && Number(bid.amount || 0) > 0)
    .sort(compareWinnerBids)[0] || null;

const getWinningBid = async (auctionId) =>
  Bid.find({ auctionItem: auctionId })
    .sort({ amount: -1, createdAt: 1, _id: 1 })
    .limit(1)
    .then((rows) => rows[0] || null);

const notifySuperAdmins = async ({ auction, title, message, actionPath, dedupeKey }) => {
  const admins = await User.find({ role: "Super Admin", accountStatus: "Active" })
    .select("_id")
    .lean();

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        user: admin._id,
        auction,
        type: "admin",
        title,
        message,
        actionPath,
        dedupeKey: dedupeKey ? `${dedupeKey}:${admin._id}` : undefined,
      })
    )
  );
};

const claimAuctionForClose = async ({ auctionId, now, reason, force = false }) => {
  const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
  const retryableStatuses = [
    { closureStatus: { $exists: false } },
    { closureStatus: AUCTION_CLOSURE_STATUS.OPEN },
    { closureStatus: AUCTION_CLOSURE_STATUS.FAILED },
    {
      closureStatus: AUCTION_CLOSURE_STATUS.PROCESSING,
      closureClaimedAt: { $lte: staleBefore },
    },
  ];

  const query = {
    _id: auctionId,
    status: { $ne: "Draft" },
    endTime: { $lte: now },
    $or: force
      ? [
          ...retryableStatuses,
          { closureStatus: { $in: FINAL_AUCTION_CLOSURE_STATUSES } },
        ]
      : retryableStatuses,
  };

  return Auction.findOneAndUpdate(
    query,
    {
      $set: {
        closureStatus: AUCTION_CLOSURE_STATUS.PROCESSING,
        closureClaimedAt: now,
        closureReason: reason,
        closureError: "",
      },
    },
    { new: true }
  );
};

const publishClosedSnapshot = (auction, now) => {
  publishAuctionEvent(auction._id, {
    type: "auction_closed",
    snapshot: buildAuctionSyncSnapshot(auction, now),
  });
};

const recordWinnerStatsOnce = async ({ auctionId, bidderId, amount }) => {
  const claimed = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      winnerStatsRecorded: { $ne: true },
    },
    {
      $set: { winnerStatsRecorded: true },
    },
    { new: true }
  );

  if (!claimed) return false;

  await User.findByIdAndUpdate(bidderId, {
    $inc: {
      moneySpent: Number(amount || 0),
      auctionsWon: 1,
    },
  });
  return true;
};

const closeWithoutWinner = async ({ auction, now }) => {
  await runWithOptionalTransaction(async ({ session }) => {
    await releaseAuctionBidLocks({
      auction,
      note: "Bid lock released because auction closed without a winner",
      session,
    });
    auction.highestBidder = undefined;
    auction.closedAt = auction.closedAt || now;
    auction.commissionCalculated = true;
    auction.closureStatus = AUCTION_CLOSURE_STATUS.NO_WINNER;
    auction.closureError = "";
    bumpAuctionBidVersion(auction, now);
    await auction.save({ session });
  });

  await createNotification({
    user: auction.createdBy,
    auction: auction._id,
    type: "auction_ended",
    title: "Auction ended without a winner",
    message: `${auction.title} ended without a valid winning bid.`,
    actionPath: "/seller-dashboard",
    dedupeKey: `auction:${auction._id}:closed-no-winner:${auction.createdBy}`,
  });

  publishClosedSnapshot(auction, now);

  return {
    success: true,
    status: AUCTION_CLOSURE_STATUS.NO_WINNER,
    auction,
  };
};

const closeWithWinner = async ({ auction, winningBid, now }) => {
  const seller = await User.findById(auction.createdBy);
  if (!seller) {
    auction.closureStatus = AUCTION_CLOSURE_STATUS.FAILED;
    auction.closureError = "Auctioneer account was not found";
    auction.closedAt = auction.closedAt || now;
    bumpAuctionBidVersion(auction, now);
    await auction.save();
    publishClosedSnapshot(auction, now);
    return {
      success: false,
      status: AUCTION_CLOSURE_STATUS.FAILED,
      reason: auction.closureError,
      auction,
    };
  }

  const bidderId = winningBid.bidder.id;
  const winningAmount = money(winningBid.amount);
  const commissionAmount = calculatePlatformCommission(winningAmount);
  let settlement = {
    settled: false,
    reason: "Settlement did not run",
  };
  let fulfillmentResult = null;

  await runWithOptionalTransaction(async ({ session }) => {
    await releaseAuctionBidLocks({
      auction,
      exceptUserId: bidderId,
      note: "Non-winning bid lock released after auction close",
      session,
    });

    settlement = await captureWinningBidFunds({
      bidderId,
      sellerId: seller._id,
      auctionId: auction._id,
      bidId: winningBid._id,
      grossAmount: winningAmount,
      commissionAmount,
      session,
    });

    const settlementStatus = settlement.settled
      ? SETTLEMENT_STATUS.HELD_IN_ESCROW
      : SETTLEMENT_STATUS.NEEDS_REVIEW;

    fulfillmentResult = await ensureFulfillmentForAuction({
      auction,
      bid: winningBid,
      bidderId,
      sellerId: seller._id,
      winningAmount,
      settlementStatus,
      settlement: settlement.settled
        ? buildEscrowSettlement({
            grossAmount: settlement.grossAmount,
            commissionAmount: settlement.commissionAmount,
          })
        : {
            escrowAmount: 0,
            commissionAmount,
            sellerPayoutAmount: 0,
            note: settlement.reason,
          },
      session,
    });

    const winningBidEntry = auction.bids.find(
      (bid) => bid.userId?.toString() === bidderId?.toString()
    );
    if (winningBidEntry && settlement.settled) {
      winningBidEntry.lockedAmount = 0;
    }

    auction.highestBidder = bidderId;
    auction.currentBid = winningAmount;
    auction.closedAt = auction.closedAt || now;
    auction.commissionCalculated = true;
    auction.closureStatus = settlement.settled
      ? AUCTION_CLOSURE_STATUS.CLOSED
      : AUCTION_CLOSURE_STATUS.NEEDS_REVIEW;
    auction.closureError = settlement.settled ? "" : settlement.reason;
    bumpAuctionBidVersion(auction, now);
    await auction.save({ session });
  });

  const bidder = await User.findById(bidderId);
  if (bidder) {
    await recordWinnerStatsOnce({
      auctionId: auction._id,
      bidderId,
      amount: winningAmount,
    });

    await createNotification({
      user: bidder._id,
      auction: auction._id,
      type: "auction_won",
      title: "You won an auction",
      message: settlement.settled
        ? `You won ${auction.title}. Add your delivery address so the seller can ship it.`
        : `You won ${auction.title}. Settlement needs review before shipment.`,
      actionPath: `/won-auctions#won-auction-${auction._id}`,
      dedupeKey: `auction:${auction._id}:winner:${bidder._id}`,
    });

    await createNotification({
      user: bidder._id,
      auction: auction._id,
      type: "fulfillment",
      title: "Delivery address needed",
      message: `Add delivery details for ${auction.title} so the seller can ship your item.`,
      actionPath: `/won-auctions#won-auction-${auction._id}`,
      dedupeKey: `auction:${auction._id}:winner-address:${bidder._id}`,
    });
  }

  await createNotification({
    user: seller._id,
    auction: auction._id,
    type: settlement.settled ? "fulfillment" : "wallet",
    title: settlement.settled
      ? "Waiting for buyer address"
      : "Settlement needs review",
    message: settlement.settled
      ? `${auction.title} has a winner. Shipment unlocks after the buyer adds delivery details.`
      : `${auction.title} closed, but wallet capture could not be completed automatically.`,
    actionPath: "/seller-dashboard#fulfillment",
    dedupeKey: `auction:${auction._id}:seller-handoff:${seller._id}`,
  });

  if (!settlement.settled) {
    await notifySuperAdmins({
      auction: auction._id,
      title: "Auction settlement needs review",
      message: `${auction.title} closed with a winner, but wallet capture needs admin review.`,
      actionPath: "/dashboard",
      dedupeKey: `auction:${auction._id}:admin-settlement-review`,
    });
  }

  publishClosedSnapshot(auction, now);

  return {
    success: true,
    status: auction.closureStatus,
    auction,
    settlement,
    fulfillment: fulfillmentResult?.fulfillment,
    fulfillmentCreated: Boolean(fulfillmentResult?.created),
  };
};

const processClaimedAuction = async ({ auction, now }) => {
  const winningBid = await getWinningBid(auction._id);
  if (!winningBid) {
    return closeWithoutWinner({ auction, now });
  }
  return closeWithWinner({ auction, winningBid, now });
};

export const closeAuctionIfDue = async (
  auctionId,
  { now = new Date(), reason = "read-repair", force = false } = {}
) => {
  const claimedAuction = await claimAuctionForClose({
    auctionId,
    now,
    reason,
    force,
  });

  if (!claimedAuction) {
    const current = await Auction.findById(auctionId);
    return {
      success: Boolean(current),
      skipped: true,
      status: current?.closureStatus,
      auction: current,
    };
  }

  if (!isEndedAt(claimedAuction, now)) {
    claimedAuction.closureStatus = AUCTION_CLOSURE_STATUS.OPEN;
    claimedAuction.closureClaimedAt = undefined;
    claimedAuction.closureReason = "";
    await claimedAuction.save();
    return {
      success: true,
      skipped: true,
      status: AUCTION_CLOSURE_STATUS.OPEN,
      auction: claimedAuction,
    };
  }

  try {
    return await processClaimedAuction({ auction: claimedAuction, now });
  } catch (error) {
    claimedAuction.closureStatus = AUCTION_CLOSURE_STATUS.FAILED;
    claimedAuction.closureError = String(error?.message || error || "Auction close failed").slice(0, 500);
    claimedAuction.closedAt = claimedAuction.closedAt || now;
    bumpAuctionBidVersion(claimedAuction, now);
    await claimedAuction.save();
    publishClosedSnapshot(claimedAuction, now);
    return {
      success: false,
      status: AUCTION_CLOSURE_STATUS.FAILED,
      reason: claimedAuction.closureError,
      auction: claimedAuction,
    };
  }
};

export const closeEndedAuctions = async ({
  now = new Date(),
  limit = DEFAULT_CLOSE_LIMIT,
  reason = "cron",
} = {}) => {
  const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
  const cappedLimit = Math.min(Math.max(Number(limit) || DEFAULT_CLOSE_LIMIT, 1), 100);
  const candidates = await Auction.find({
    status: { $ne: "Draft" },
    endTime: { $lte: now },
    $or: [
      { closureStatus: { $exists: false } },
      { closureStatus: AUCTION_CLOSURE_STATUS.OPEN },
      { closureStatus: AUCTION_CLOSURE_STATUS.FAILED },
      {
        closureStatus: AUCTION_CLOSURE_STATUS.PROCESSING,
        closureClaimedAt: { $lte: staleBefore },
      },
    ],
  })
    .select("_id")
    .sort({ endTime: 1 })
    .limit(cappedLimit);

  const results = [];
  for (const candidate of candidates) {
    results.push(
      await closeAuctionIfDue(candidate._id, {
        now,
        reason,
      })
    );
  }

  return {
    attemptedCount: candidates.length,
    closedCount: results.filter((result) =>
      [
        AUCTION_CLOSURE_STATUS.CLOSED,
        AUCTION_CLOSURE_STATUS.NO_WINNER,
        AUCTION_CLOSURE_STATUS.NEEDS_REVIEW,
      ].includes(result.status)
    ).length,
    failedCount: results.filter(
      (result) => result.status === AUCTION_CLOSURE_STATUS.FAILED
    ).length,
    results,
  };
};

export const repairClosedAuction = async (
  auctionId,
  { now = new Date(), reason = "legacy-repair" } = {}
) => {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.status === "Draft" || !isEndedAt(auction, now)) {
    return {
      success: Boolean(auction),
      skipped: true,
      status: auction?.closureStatus,
      auction,
    };
  }

  const winningBid = await getWinningBid(auction._id);
  if (!winningBid) {
    if (auction.closureStatus === AUCTION_CLOSURE_STATUS.NO_WINNER && auction.closedAt) {
      return { success: true, skipped: true, status: auction.closureStatus, auction };
    }
    return closeAuctionIfDue(auction._id, { now, reason, force: true });
  }

  const fulfillment = await Fulfillment.findOne({ auction: auction._id }).select("_id");
  const missingWinner = !auction.highestBidder;
  const missingFulfillment = !fulfillment;
  const notFinal = !FINAL_AUCTION_CLOSURE_STATUSES.includes(auction.closureStatus);

  if (!missingWinner && !missingFulfillment && !notFinal && auction.closedAt) {
    return { success: true, skipped: true, status: auction.closureStatus, auction };
  }

  return closeAuctionIfDue(auction._id, { now, reason, force: true });
};
