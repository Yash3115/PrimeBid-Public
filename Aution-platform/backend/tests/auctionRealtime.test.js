import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuctionSyncSnapshot,
  bumpAuctionBidVersion,
  getAuctionBidVersion,
  hasAuctionChangedSince,
  publishAuctionEvent,
  subscribeAuctionEvents,
} from "../utils/auctionRealtime.js";
import { AUCTION_RUNTIME_STATUS } from "../utils/auctionStatus.js";

const baseAuction = {
  _id: "auction-1",
  status: "Published",
  startTime: "2026-05-30T09:00:00.000Z",
  endTime: "2026-05-30T11:00:00.000Z",
  startingBid: 1000,
  currentBid: 1500,
  bidVersion: 2,
  lastBidAt: "2026-05-30T10:00:00.000Z",
  bids: [
    { userId: "bidder-a", amount: 1500 },
    { userId: "bidder-b", amount: 1200 },
  ],
};

test("builds a compact auction sync snapshot without private auto-bid data", () => {
  const snapshot = buildAuctionSyncSnapshot(
    {
      ...baseAuction,
      autoBids: [{ userId: "bidder-a", maxAmount: 5000 }],
    },
    "2026-05-30T10:30:00.000Z"
  );

  assert.equal(snapshot.auctionId, "auction-1");
  assert.equal(snapshot.bidVersion, 2);
  assert.equal(snapshot.currentBid, 1500);
  assert.equal(snapshot.bidCount, 2);
  assert.equal(snapshot.leadingBidderId, "bidder-a");
  assert.equal(snapshot.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(Object.hasOwn(snapshot, "autoBids"), false);
});

test("tracks auction revision changes defensively", () => {
  const auction = { bidVersion: 0 };

  assert.equal(getAuctionBidVersion(auction), 0);
  assert.equal(bumpAuctionBidVersion(auction, "2026-05-30T10:00:00.000Z"), 1);
  assert.equal(auction.bidVersion, 1);
  assert.equal(
    new Date(auction.lastBidAt).toISOString(),
    "2026-05-30T10:00:00.000Z"
  );
  assert.equal(hasAuctionChangedSince(auction, 1), false);
  assert.equal(hasAuctionChangedSince(auction, 0), true);
  assert.equal(hasAuctionChangedSince(auction, ""), true);
});

test("publishes auction events only to matching subscribers", () => {
  const received = [];
  const unsubscribe = subscribeAuctionEvents("auction-1", (event) => {
    received.push(event);
  });

  publishAuctionEvent("auction-2", { type: "bid", snapshot: { bidVersion: 2 } });
  publishAuctionEvent("auction-1", { type: "bid", snapshot: { bidVersion: 3 } });
  unsubscribe();
  publishAuctionEvent("auction-1", { type: "bid", snapshot: { bidVersion: 4 } });

  assert.equal(received.length, 1);
  assert.equal(received[0].type, "bid");
  assert.equal(received[0].snapshot.bidVersion, 3);
});
