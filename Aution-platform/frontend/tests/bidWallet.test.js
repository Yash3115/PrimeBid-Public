import assert from "node:assert/strict";
import test from "node:test";
import {
  getBidderAuctionBidEntry,
  getBidderAuctionLock,
  getBidWalletRequirement,
  idsMatch,
} from "../src/lib/bidWallet.js";

test("matches plain and nested user ids", () => {
  assert.equal(idsMatch("user-1", "user-1"), true);
  assert.equal(idsMatch({ _id: "user-1" }, "user-1"), true);
  assert.equal(idsMatch({ id: "user-1" }, { _id: "user-1" }), true);
  assert.equal(idsMatch("user-1", "user-2"), false);
});

test("finds the current user's existing auction lock", () => {
  const bidders = [
    { userId: "other", lockedAmount: 20000 },
    { userId: "bidder", lockedAmount: 81311 },
  ];

  assert.equal(getBidderAuctionLock(bidders, "bidder"), 81311);
});

test("finds the current user's bid entry for auto-bid management", () => {
  const bidders = [
    { userId: "other", amount: 90000, lockedAmount: 90000 },
    { userId: "bidder", amount: 81311, lockedAmount: 81311 },
  ];

  assert.equal(getBidderAuctionBidEntry(bidders, "bidder").amount, 81311);
  assert.equal(getBidderAuctionBidEntry(bidders, "missing"), null);
});

test("same-auction bid increases require only the incremental lock", () => {
  const requirement = getBidWalletRequirement({
    walletAvailable: 18689,
    currentAuctionLock: 81311,
    bidAmount: 81811,
  });

  assert.equal(requirement.additionalLock, 500);
  assert.equal(requirement.shortfall, 0);
  assert.equal(requirement.canCover, true);
  assert.equal(requirement.biddingPower, 100000);
});

test("same-auction bid reports only the missing incremental amount", () => {
  const requirement = getBidWalletRequirement({
    walletAvailable: 18689,
    currentAuctionLock: 81311,
    bidAmount: 105000,
  });

  assert.equal(requirement.additionalLock, 23689);
  assert.equal(requirement.shortfall, 5000);
  assert.equal(requirement.canCover, false);
});
