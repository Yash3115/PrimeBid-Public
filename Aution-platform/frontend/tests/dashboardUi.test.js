import assert from "node:assert/strict";
import test from "node:test";
import {
  filterActionableBidLocks,
  getAuctionImageSrc,
  getSellerFulfillmentPriority,
  sortSellerFulfillmentQueue,
} from "../src/lib/dashboardUi.js";
import {
  FULFILLMENT_STATUS,
  SETTLEMENT_STATUS,
} from "../src/lib/fulfillment.js";

test("auction image helper falls back for empty image values", () => {
  assert.equal(getAuctionImageSrc(null), "/imageHolder.jpg");
  assert.equal(getAuctionImageSrc({ url: " " }), "/imageHolder.jpg");
  assert.equal(getAuctionImageSrc({ url: "/uploads/item.jpg" }), "/uploads/item.jpg");
  assert.equal(getAuctionImageSrc("data:image/png;base64,abc"), "data:image/png;base64,abc");
});

test("bidder dashboard keeps only live locked bids as active work", () => {
  const locks = [
    { bidId: "live", runtimeStatus: "Live", amount: 80000 },
    { bidId: "ended", runtimeStatus: "Ended", amount: 80000 },
    { bidId: "upcoming", runtimeStatus: "Upcoming", amount: 1000 },
    { bidId: "zero", runtimeStatus: "Live", amount: 0 },
  ];

  assert.deepEqual(
    filterActionableBidLocks(locks).map((lock) => lock.bidId),
    ["live"]
  );
});

test("seller fulfillment queue is ordered by operational urgency", () => {
  const queue = [
    {
      _id: "delivered",
      status: FULFILLMENT_STATUS.DELIVERED,
      settlementStatus: SETTLEMENT_STATUS.READY_TO_RELEASE,
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
    {
      _id: "awaiting-address",
      status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
      updatedAt: "2026-05-03T00:00:00.000Z",
    },
    {
      _id: "ready",
      status: FULFILLMENT_STATUS.READY_TO_SHIP,
      updatedAt: "2026-05-02T00:00:00.000Z",
    },
    {
      _id: "issue",
      status: FULFILLMENT_STATUS.ISSUE_REPORTED,
      dispute: { isOpen: true },
      updatedAt: "2026-05-04T00:00:00.000Z",
    },
  ];

  assert.equal(
    getSellerFulfillmentPriority(queue[3]) <
      getSellerFulfillmentPriority(queue[2]),
    true
  );
  assert.deepEqual(
    sortSellerFulfillmentQueue(queue).map((fulfillment) => fulfillment._id),
    ["issue", "ready", "awaiting-address", "delivered"]
  );
});
