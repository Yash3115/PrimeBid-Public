import { AUCTION_RUNTIME_STATUS, getAuctionTiming } from "./auctionStatus.js";
import { FULFILLMENT_STATUS, SETTLEMENT_STATUS } from "./fulfillment.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const toId = (value) =>
  value?._id?.toString?.() || value?.toString?.() || "";

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

export const SELLER_RISK_LEVEL = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const getSellerRiskLevel = (score = 0) => {
  const normalized = clampScore(score);
  if (normalized >= 65) return SELLER_RISK_LEVEL.HIGH;
  if (normalized >= 35) return SELLER_RISK_LEVEL.MEDIUM;
  return SELLER_RISK_LEVEL.LOW;
};

const isFulfillmentDisputed = (fulfillment = {}) =>
  Boolean(fulfillment.dispute?.status || fulfillment.dispute?.isOpen);

const isFulfillmentOpenIssue = (fulfillment = {}) =>
  fulfillment.status === FULFILLMENT_STATUS.ISSUE_REPORTED ||
  Boolean(fulfillment.dispute?.isOpen);

const isFulfillmentRefunded = (fulfillment = {}) =>
  fulfillment.settlementStatus === SETTLEMENT_STATUS.REFUNDED_TO_BUYER;

const isFulfillmentCompleted = (fulfillment = {}) =>
  fulfillment.settlementStatus === SETTLEMENT_STATUS.RELEASED_TO_SELLER ||
  Boolean(fulfillment.settlement?.releasedAt);

const isLateShipment = (fulfillment = {}, now = new Date()) => {
  if (fulfillment.status !== FULFILLMENT_STATUS.READY_TO_SHIP) return false;
  const readyAt = new Date(fulfillment.addressSubmittedAt || fulfillment.updatedAt);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(readyAt.getTime()) || !Number.isFinite(nowMs)) return false;
  return nowMs - readyAt.getTime() > 3 * DAY_MS;
};

const buildTrustBadges = ({
  seller,
  ratingAverage,
  ratingCount,
  completedSales,
  disputeRate,
  lateShipmentCount,
}) => {
  const badges = [];
  const kycApproved = seller?.kycStatus === "Approved";

  if (kycApproved) {
    badges.push({
      id: "verified-seller",
      label: "Verified seller",
      tone: "emerald",
      description: "Auctioneer KYC is approved.",
    });
  }
  if (ratingCount <= 0 && completedSales < 3) {
    badges.push({
      id: "new-seller",
      label: "New seller",
      tone: "slate",
      description: "Limited completed-sale history on PrimeBid.",
    });
  }
  if (ratingCount >= 3 && ratingAverage >= 4.5) {
    badges.push({
      id: "top-rated",
      label: "Top rated",
      tone: "amber",
      description: "Strong buyer feedback from completed orders.",
    });
  }
  if (completedSales >= 3) {
    badges.push({
      id: "experienced-seller",
      label: "Experienced seller",
      tone: "indigo",
      description: "Multiple completed PrimeBid handoffs.",
    });
  }
  if (completedSales >= 3 && disputeRate <= 0.1) {
    badges.push({
      id: "low-dispute-rate",
      label: "Low dispute rate",
      tone: "emerald",
      description: "Few delivery issues relative to completed orders.",
    });
  }
  if (completedSales >= 3 && lateShipmentCount === 0) {
    badges.push({
      id: "reliable-shipper",
      label: "Reliable shipper",
      tone: "emerald",
      description: "No delayed ready-to-ship orders currently flagged.",
    });
  }

  return badges.slice(0, 5);
};

export const buildSellerQualityProfile = ({
  seller = {},
  fulfillments = [],
  auctions = [],
  now = new Date(),
} = {}) => {
  const ratingAverage = toNumber(seller?.reputation?.ratingAverage);
  const ratingCount = toNumber(seller?.reputation?.ratingCount);
  const totalFulfillments = fulfillments.length;
  const completedSales = fulfillments.filter(isFulfillmentCompleted).length;
  const disputedOrders = fulfillments.filter(isFulfillmentDisputed).length;
  const openDisputes = fulfillments.filter(isFulfillmentOpenIssue).length;
  const refundedOrders = fulfillments.filter(isFulfillmentRefunded).length;
  const lateShipmentCount = fulfillments.filter((fulfillment) =>
    isLateShipment(fulfillment, now)
  ).length;
  const deliveryConfirmationRate =
    totalFulfillments > 0 ? completedSales / totalFulfillments : 0;
  const disputeRate =
    totalFulfillments > 0 ? disputedOrders / totalFulfillments : 0;
  const refundRate =
    totalFulfillments > 0 ? refundedOrders / totalFulfillments : 0;
  const activeAuctions = auctions.filter((auction) => {
    const status = getAuctionTiming(auction, now).runtimeStatus;
    return [AUCTION_RUNTIME_STATUS.LIVE, AUCTION_RUNTIME_STATUS.UPCOMING].includes(
      status
    );
  }).length;

  const reasons = [];
  let score = 0;

  if (ratingCount === 0) {
    score += 8;
    reasons.push("No seller reviews yet");
  } else if (ratingAverage < 4.2) {
    const penalty = Math.min((4.2 - ratingAverage) * 20, 30);
    score += penalty;
    reasons.push(`Seller rating is ${ratingAverage.toFixed(1)}/5`);
  }

  if (disputeRate > 0.2) {
    score += disputeRate * 45;
    reasons.push(`${Math.round(disputeRate * 100)}% dispute rate`);
  } else if (disputedOrders > 0) {
    score += disputeRate * 25;
  }

  if (refundRate > 0) {
    score += refundRate * 35;
    reasons.push(`${refundedOrders} refunded order${refundedOrders === 1 ? "" : "s"}`);
  }

  if (openDisputes > 0) {
    score += Math.min(openDisputes * 12, 24);
    reasons.push(`${openDisputes} unresolved delivery issue${openDisputes === 1 ? "" : "s"}`);
  }

  if (lateShipmentCount > 0) {
    score += Math.min(lateShipmentCount * 8, 24);
    reasons.push(`${lateShipmentCount} shipment${lateShipmentCount === 1 ? "" : "s"} delayed after address submission`);
  }

  if (seller?.accountStatus === "Paused") {
    score += 20;
    reasons.push("Seller account is paused");
  }

  score -= Math.min(completedSales * 1.5, 15);
  const riskScore = clampScore(score);
  const riskLevel = getSellerRiskLevel(riskScore);

  if (riskLevel === SELLER_RISK_LEVEL.LOW && reasons.length === 0) {
    reasons.push(
      completedSales > 0
        ? "No significant seller quality issues detected"
        : "New seller with no negative history"
    );
  }

  return {
    sellerId: toId(seller),
    userName: seller?.userName || "Seller",
    email: seller?.email || "",
    accountStatus: seller?.accountStatus || "Active",
    kycStatus: seller?.kycStatus || "Not Submitted",
    ratingAverage,
    ratingCount,
    completedSales,
    totalOrders: totalFulfillments,
    disputedOrders,
    openDisputes,
    refundedOrders,
    lateShipmentCount,
    activeAuctions,
    disputeRate: Number(disputeRate.toFixed(3)),
    refundRate: Number(refundRate.toFixed(3)),
    deliveryConfirmationRate: Number(deliveryConfirmationRate.toFixed(3)),
    riskScore,
    riskLevel,
    reasons,
    trustBadges: buildTrustBadges({
      seller,
      ratingAverage,
      ratingCount,
      completedSales,
      disputeRate,
      lateShipmentCount,
    }),
  };
};

export const buildSellerQualityMap = ({
  sellers = [],
  fulfillments = [],
  auctions = [],
  now = new Date(),
} = {}) => {
  const fulfillmentBySeller = new Map();
  const auctionBySeller = new Map();

  for (const fulfillment of fulfillments) {
    const sellerId = toId(fulfillment.seller);
    if (!sellerId) continue;
    fulfillmentBySeller.set(sellerId, [
      ...(fulfillmentBySeller.get(sellerId) || []),
      fulfillment,
    ]);
  }

  for (const auction of auctions) {
    const sellerId = toId(auction.createdBy);
    if (!sellerId) continue;
    auctionBySeller.set(sellerId, [
      ...(auctionBySeller.get(sellerId) || []),
      auction,
    ]);
  }

  return new Map(
    sellers.map((seller) => {
      const sellerId = toId(seller);
      return [
        sellerId,
        buildSellerQualityProfile({
          seller,
          fulfillments: fulfillmentBySeller.get(sellerId) || [],
          auctions: auctionBySeller.get(sellerId) || [],
          now,
        }),
      ];
    })
  );
};
