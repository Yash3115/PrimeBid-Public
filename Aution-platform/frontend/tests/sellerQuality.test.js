import assert from "node:assert/strict";
import test from "node:test";
import {
  SELLER_RISK_LEVEL,
  formatPercent,
  getSellerQuality,
  getSellerRiskClass,
  getSellerRiskSummary,
  normalizeTrustBadges,
} from "../src/lib/sellerQuality.js";

test("formats seller quality percentages and risk copy", () => {
  assert.equal(formatPercent(0.126), "13%");
  assert.match(
    getSellerRiskClass(SELLER_RISK_LEVEL.HIGH),
    /red/
  );
  assert.equal(
    getSellerRiskSummary({
      riskLevel: SELLER_RISK_LEVEL.MEDIUM,
      reasons: ["Refund rate is rising"],
    }),
    "Refund rate is rising"
  );
});

test("extracts seller quality from auction payloads", () => {
  const quality = { riskLevel: SELLER_RISK_LEVEL.LOW };

  assert.equal(getSellerQuality({ sellerQuality: quality }), quality);
  assert.equal(
    getSellerQuality({ createdBy: { sellerQuality: quality } }),
    quality
  );
  assert.equal(getSellerQuality({}), null);
});

test("falls back to real-data trust badges for sellers without a quality profile", () => {
  assert.deepEqual(
    normalizeTrustBadges(null, { kycStatus: "Approved" }).map((badge) => badge.id),
    ["verified-seller"]
  );
  assert.deepEqual(
    normalizeTrustBadges(null, {}).map((badge) => badge.id),
    ["new-seller"]
  );
});
