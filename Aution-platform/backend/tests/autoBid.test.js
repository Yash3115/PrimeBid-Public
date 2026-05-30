import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAutoBidLimit,
  findAutoBidByUser,
  resolveAutoBidChallenge,
} from "../utils/autoBid.js";

test("existing auto-bid responds one increment above a normal bid", () => {
  const challenge = resolveAutoBidChallenge({
    currentBidderId: "bidder-b",
    currentBid: 1100,
    increment: 100,
    autoBids: [{ userId: "bidder-a", maxAmount: 1500 }],
  });

  assert.equal(challenge.winner, "auto");
  assert.equal(challenge.autoBid.userId, "bidder-a");
  assert.equal(challenge.autoFinalAmount, 1200);
});

test("new bidder with higher auto max immediately beats lower existing auto max", () => {
  const challenge = resolveAutoBidChallenge({
    currentBidderId: "bidder-b",
    currentBid: 200,
    currentBidderMax: 2000,
    increment: 100,
    autoBids: [{ userId: "bidder-a", maxAmount: 1000 }],
  });

  assert.equal(challenge.winner, "current");
  assert.equal(challenge.currentFinalAmount, 1100);
  assert.equal(challenge.autoMaxAmount, 1000);
});

test("existing higher auto max beats a lower new auto max at one increment over it", () => {
  const challenge = resolveAutoBidChallenge({
    currentBidderId: "bidder-b",
    currentBid: 1100,
    currentBidderMax: 1300,
    increment: 100,
    autoBids: [{ userId: "bidder-a", maxAmount: 2000 }],
  });

  assert.equal(challenge.winner, "auto");
  assert.equal(challenge.autoFinalAmount, 1400);
});

test("does not auto-bid when no competitor can meet the next increment", () => {
  const challenge = resolveAutoBidChallenge({
    currentBidderId: "bidder-b",
    currentBid: 1100,
    increment: 100,
    autoBids: [{ userId: "bidder-a", maxAmount: 1199 }],
  });

  assert.equal(challenge, null);
});

test("ignores the current bidder's own stored auto-bid record", () => {
  const challenge = resolveAutoBidChallenge({
    currentBidderId: "bidder-b",
    currentBid: 1100,
    currentBidderMax: 2000,
    increment: 100,
    autoBids: [
      { userId: "bidder-b", maxAmount: 2000 },
      { userId: "bidder-a", maxAmount: 1199 },
    ],
  });

  assert.equal(challenge, null);
});

test("finds a user's active auto-bid without exposing other max bids", () => {
  const autoBid = findAutoBidByUser(
    [
      { userId: "bidder-a", maxAmount: 1500 },
      { userId: "bidder-b", maxAmount: 2500 },
    ],
    "bidder-b"
  );

  assert.equal(autoBid.maxAmount, 2500);
});

test("can lower an active auto-bid limit without changing the current bid", () => {
  const auction = {
    autoBids: [{ userId: "bidder-a", maxAmount: 2500 }],
  };

  const result = applyAutoBidLimit({
    auction,
    user: { _id: "bidder-a", userName: "Bidder A" },
    maxAmount: 1800,
    currentBidAmount: 1200,
  });

  assert.deepEqual(result, {
    active: true,
    maxAmount: 1800,
    changed: true,
  });
  assert.equal(auction.autoBids[0].maxAmount, 1800);
});

test("can create an auto-bid limit for a bidder with an existing bid", () => {
  const auction = {};

  const result = applyAutoBidLimit({
    auction,
    user: { _id: "bidder-a", userName: "Bidder A" },
    maxAmount: 1800,
    currentBidAmount: 1200,
  });

  assert.equal(result.active, true);
  assert.equal(result.maxAmount, 1800);
  assert.equal(auction.autoBids.length, 1);
});

test("cancels future auto-bidding when max is cleared or no higher than current bid", () => {
  const auction = {
    autoBids: [{ userId: "bidder-a", maxAmount: 2500 }],
  };

  const result = applyAutoBidLimit({
    auction,
    user: { _id: "bidder-a", userName: "Bidder A" },
    maxAmount: 1200,
    currentBidAmount: 1200,
  });

  assert.deepEqual(result, {
    active: false,
    maxAmount: null,
    changed: true,
  });
  assert.equal(auction.autoBids.length, 0);
});
