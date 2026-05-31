import assert from "node:assert/strict";
import test from "node:test";
import Auction from "../models/auctionSchema.js";
import Notification from "../models/notificationSchema.js";
import {
  AUCTION_CLOSURE_STATUS,
  calculatePlatformCommission,
  chooseWinningBidFromList,
  compareWinnerBids,
} from "../utils/auctionClosing.js";

test("chooses the highest bid as the auction winner", () => {
  const winner = chooseWinningBidFromList([
    {
      _id: "665000000000000000000001",
      amount: 1200,
      createdAt: new Date("2026-01-01T00:00:02.000Z"),
      bidder: { id: "664000000000000000000001" },
    },
    {
      _id: "665000000000000000000002",
      amount: 1500,
      createdAt: new Date("2026-01-01T00:00:01.000Z"),
      bidder: { id: "664000000000000000000002" },
    },
  ]);

  assert.equal(winner.amount, 1500);
});

test("breaks winning bid ties by earlier createdAt and then id", () => {
  const earlier = {
    _id: "665000000000000000000002",
    amount: 1500,
    createdAt: new Date("2026-01-01T00:00:01.000Z"),
    bidder: { id: "664000000000000000000002" },
  };
  const later = {
    _id: "665000000000000000000001",
    amount: 1500,
    createdAt: new Date("2026-01-01T00:00:02.000Z"),
    bidder: { id: "664000000000000000000001" },
  };

  assert.equal(compareWinnerBids(earlier, later), -1000);
  assert.equal(chooseWinningBidFromList([later, earlier])._id, earlier._id);

  const smallerId = {
    ...earlier,
    _id: "665000000000000000000001",
  };
  const biggerId = {
    ...earlier,
    _id: "665000000000000000000003",
  };
  assert.equal(chooseWinningBidFromList([biggerId, smallerId])._id, smallerId._id);
});

test("ignores invalid winner bids without a bidder or positive amount", () => {
  const winner = chooseWinningBidFromList([
    { amount: 2000, bidder: {} },
    { amount: 0, bidder: { id: "664000000000000000000001" } },
  ]);

  assert.equal(winner, null);
});

test("calculates the platform commission from the winning amount", () => {
  assert.equal(calculatePlatformCommission(10000), 500);
  assert.equal(calculatePlatformCommission(999.99), 50);
  assert.equal(calculatePlatformCommission(0), 0);
});

test("auction schema exposes idempotent closure state fields", () => {
  const statusPath = Auction.schema.path("closureStatus");

  assert.deepEqual(statusPath.enumValues.sort(), Object.values(AUCTION_CLOSURE_STATUS).sort());
  assert.equal(Auction.schema.path("winnerStatsRecorded").defaultValue, false);
  assert.ok(
    Auction.schema.indexes().some(([fields]) => {
      return fields.status === 1 && fields.closureStatus === 1 && fields.endTime === 1;
    })
  );
});

test("notification schema supports deduped close workflow messages", () => {
  assert.ok(Notification.schema.path("dedupeKey"));
  assert.ok(
    Notification.schema.indexes().some(([fields, options]) => {
      return fields.dedupeKey === 1 && options?.unique === true && options?.sparse === true;
    })
  );
});
