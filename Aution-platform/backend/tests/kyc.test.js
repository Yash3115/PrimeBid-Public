import assert from "node:assert/strict";
import test from "node:test";
import { requireAuctioneerKyc } from "../middlewares/kyc.js";
import { buildKycCompatibilityUpdates } from "../utils/kycCompatibility.js";

const runMiddleware = (user) =>
  new Promise((resolve) => {
    requireAuctioneerKyc({ user }, {}, (error) => resolve(error || null));
  });

test("allows approved auctioneers to list auctions", async () => {
  const error = await runMiddleware({
    role: "Auctioneer",
    kycStatus: "Approved",
  });

  assert.equal(error, null);
});

test("blocks auctioneers without approved KYC", async () => {
  const error = await runMiddleware({
    role: "Auctioneer",
    kycStatus: "Pending",
  });

  assert.equal(error.statusCode, 403);
  assert.match(error.message, /KYC approval/);
});

test("does not apply auctioneer KYC middleware to other roles", async () => {
  const error = await runMiddleware({
    role: "Bidder",
    kycStatus: "Approved",
  });

  assert.equal(error, null);
});

test("KYC compatibility update only targets missing or invalid legacy statuses", () => {
  const reviewedAt = new Date("2026-05-30T00:00:00.000Z");
  const updates = buildKycCompatibilityUpdates(reviewedAt);

  assert.equal(updates.length, 2);
  assert.equal(updates[0].filter.role, "Auctioneer");
  assert.deepEqual(updates[0].filter.$or[0], {
    kycStatus: { $exists: false },
  });
  assert.deepEqual(updates[0].update.$set, {
    kycStatus: "Approved",
    kycRejectionReason: "",
    kycReviewedAt: reviewedAt,
  });
  assert.deepEqual(updates[1].filter.role, {
    $in: ["Bidder", "Super Admin"],
  });
});
