import assert from "node:assert/strict";
import test from "node:test";
import {
  SELLER_RISK_LEVEL,
  buildSellerQualityProfile,
  getSellerRiskLevel,
} from "../utils/sellerQuality.js";
import { SETTLEMENT_STATUS } from "../utils/fulfillment.js";

test("scores new sellers as low risk with a new seller badge", () => {
  const quality = buildSellerQualityProfile({
    seller: {
      _id: "seller-1",
      userName: "New Seller",
      kycStatus: "Approved",
      reputation: { ratingAverage: 0, ratingCount: 0 },
    },
    fulfillments: [],
    auctions: [],
    now: new Date("2026-01-10T00:00:00.000Z"),
  });

  assert.equal(quality.riskLevel, SELLER_RISK_LEVEL.LOW);
  assert.equal(quality.completedSales, 0);
  assert.ok(quality.trustBadges.some((badge) => badge.id === "new-seller"));
  assert.ok(quality.trustBadges.some((badge) => badge.id === "verified-seller"));
});

test("detects high-risk sellers from disputes, refunds, and low rating", () => {
  const quality = buildSellerQualityProfile({
    seller: {
      _id: "seller-2",
      userName: "Risky Seller",
      kycStatus: "Approved",
      reputation: { ratingAverage: 3.1, ratingCount: 4 },
    },
    fulfillments: [
      {
        settlementStatus: SETTLEMENT_STATUS.REFUNDED_TO_BUYER,
        dispute: { isOpen: false, status: "BuyerFavored" },
        status: "Delivered",
      },
      {
        settlementStatus: SETTLEMENT_STATUS.UNDER_DISPUTE,
        dispute: { isOpen: true, status: "Open" },
        status: "IssueReported",
      },
      {
        settlementStatus: SETTLEMENT_STATUS.RELEASED_TO_SELLER,
        status: "Delivered",
      },
    ],
    auctions: [],
    now: new Date("2026-01-10T00:00:00.000Z"),
  });

  assert.equal(quality.riskLevel, SELLER_RISK_LEVEL.HIGH);
  assert.equal(quality.refundedOrders, 1);
  assert.equal(quality.openDisputes, 1);
  assert.ok(quality.reasons.some((reason) => reason.includes("dispute rate")));
});

test("risk level thresholds are stable", () => {
  assert.equal(getSellerRiskLevel(10), SELLER_RISK_LEVEL.LOW);
  assert.equal(getSellerRiskLevel(35), SELLER_RISK_LEVEL.MEDIUM);
  assert.equal(getSellerRiskLevel(65), SELLER_RISK_LEVEL.HIGH);
});
