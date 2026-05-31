import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBidderNextActions,
  buildSellerNextActions,
  filterNotifications,
  getNotificationMeta,
  getWinnerNextAction,
} from "../src/lib/actionInsights.js";
import { FULFILLMENT_STATUS } from "../src/lib/fulfillment.js";

test("winner next action asks for delivery address before shipment starts", () => {
  const action = getWinnerNextAction({
    _id: "auction-1",
    title: "Vintage Camera",
    fulfillment: {
      status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
    },
  });

  assert.equal(action.label, "Add delivery address");
  assert.equal(action.priority, "critical");
  assert.equal(action.to, "/won-auctions");
});

test("bidder next actions prioritize won auction handoff and outbid alerts", () => {
  const actions = buildBidderNextActions({
    availableBalance: 5000,
    bidLocks: [],
    outbidAuctions: [{ _id: "auction-2" }],
    pendingWithdrawals: [],
    wonAuctions: [
      {
        _id: "auction-1",
        title: "Phone",
        fulfillment: { status: FULFILLMENT_STATUS.AWAITING_ADDRESS },
      },
    ],
  });

  assert.deepEqual(
    actions.map((action) => action.id),
    ["winner-actions", "outbid"]
  );
  assert.equal(actions[0].priority, "critical");
  assert.equal(actions[1].to, "/auction/item/auction-2");
});

test("seller next actions surface shipping, health, and payout work", () => {
  const actions = buildSellerNextActions({
    availableBalance: 12000,
    fulfillmentQueue: [
      { status: FULFILLMENT_STATUS.READY_TO_SHIP },
      { status: FULFILLMENT_STATUS.AWAITING_ADDRESS },
    ],
    healthQueue: [{ _id: "auction-1" }],
    noBidAuctions: [],
  });

  assert.deepEqual(
    actions.map((action) => action.id),
    ["ready-to-ship", "awaiting-address", "listing-health", "withdraw"]
  );
  assert.equal(actions[0].priority, "high");
});

test("notification helpers group and route common alerts", () => {
  const notifications = [
    { _id: "1", type: "outbid", read: false, auction: { _id: "auction-1" } },
    { _id: "2", type: "wallet", read: true },
    { _id: "3", type: "auction_won", read: false },
  ];

  assert.equal(getNotificationMeta(notifications[0]).group, "bids");
  assert.equal(getNotificationMeta(notifications[0]).actionPath, "/auction/item/auction-1");
  assert.equal(getNotificationMeta(notifications[2]).actionPath, "/won-auctions");
  assert.equal(filterNotifications(notifications, "unread").length, 2);
  assert.equal(filterNotifications(notifications, "wallet").length, 1);
});
