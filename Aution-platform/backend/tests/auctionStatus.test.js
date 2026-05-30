import assert from "node:assert/strict";
import test from "node:test";
import {
  AUCTION_RUNTIME_STATUS,
  getAuctionTiming,
  withAuctionTiming,
} from "../utils/auctionStatus.js";

const baseAuction = {
  status: "Published",
  startTime: "2026-05-30T09:00:00.000Z",
  endTime: "2026-05-30T11:00:00.000Z",
};

test("marks auction as upcoming before start time", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T08:59:59.999Z");

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.UPCOMING);
  assert.equal(timing.isBiddable, false);
});

test("marks auction as live between start and end time", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T10:00:00.000Z");

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(timing.isBiddable, true);
});

test("marks auction as ended after end time", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T11:00:00.001Z");

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.ENDED);
  assert.equal(timing.isBiddable, false);
});

test("allows bidding exactly at the start time", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T09:00:00.000Z");

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(timing.isBiddable, true);
});

test("blocks bidding exactly at the end time", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T11:00:00.000Z");

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.ENDED);
  assert.equal(timing.isBiddable, false);
});

test("uses absolute UTC instants correctly for timezone-offset dates", () => {
  const timing = getAuctionTiming(
    {
      status: "Published",
      startTime: "2026-05-30T09:30:00+05:30",
      endTime: "2026-05-30T10:30:00+05:30",
    },
    "2026-05-30T04:30:00.000Z"
  );

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(timing.isBiddable, true);
});

test("derives runtime status from dates instead of a stale stored field", () => {
  const timing = getAuctionTiming(
    {
      ...baseAuction,
      runtimeStatus: "Ended",
    },
    "2026-05-30T10:00:00.000Z"
  );

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(timing.isBiddable, true);
});

test("blocks bid attempt before auction starts", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T08:30:00.000Z");

  assert.equal(timing.isBiddable, false);
});

test("allows bid attempt during a live published auction", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T10:30:00.000Z");

  assert.equal(timing.isBiddable, true);
});

test("blocks bid attempt after auction ends", () => {
  const timing = getAuctionTiming(baseAuction, "2026-05-30T12:00:00.000Z");

  assert.equal(timing.isBiddable, false);
});

test("blocks bidding for live draft auctions", () => {
  const timing = getAuctionTiming(
    { ...baseAuction, status: "Draft" },
    "2026-05-30T10:00:00.000Z"
  );

  assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.LIVE);
  assert.equal(timing.isBiddable, false);
});

test("returns invalid for missing, malformed, or reversed dates", () => {
  for (const auction of [
    { status: "Published", endTime: baseAuction.endTime },
    { status: "Published", startTime: "not-a-date", endTime: baseAuction.endTime },
    {
      status: "Published",
      startTime: "2026-05-30T11:00:00.000Z",
      endTime: "2026-05-30T09:00:00.000Z",
    },
  ]) {
    const timing = getAuctionTiming(auction, "2026-05-30T10:00:00.000Z");

    assert.equal(timing.runtimeStatus, AUCTION_RUNTIME_STATUS.INVALID);
    assert.equal(timing.isBiddable, false);
  }
});

test("does not expose private auto-bid ceilings in auction timing payloads", () => {
  const payload = withAuctionTiming(
    {
      ...baseAuction,
      autoBids: [{ userId: "bidder-a", maxAmount: 5000 }],
    },
    "2026-05-30T10:00:00.000Z"
  );

  assert.equal(Object.hasOwn(payload, "autoBids"), false);
});
