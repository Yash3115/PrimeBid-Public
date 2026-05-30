import assert from "node:assert/strict";
import test from "node:test";
import {
  FULFILLMENT_STATUS,
  canEditDeliveryAddress,
  getAuctionIdFromFulfillment,
  getFulfillmentLabel,
  getFulfillmentTone,
  sellerShipmentStatusOptions,
} from "../src/lib/fulfillment.js";

test("formats fulfillment status labels and tones", () => {
  assert.equal(
    getFulfillmentLabel(FULFILLMENT_STATUS.AWAITING_ADDRESS),
    "Awaiting address"
  );
  assert.ok(getFulfillmentTone(FULFILLMENT_STATUS.SHIPPED).includes("blue"));
});

test("locks delivery address once shipment starts", () => {
  assert.equal(canEditDeliveryAddress(FULFILLMENT_STATUS.READY_TO_SHIP), true);
  assert.equal(canEditDeliveryAddress(FULFILLMENT_STATUS.SHIPPED), false);
  assert.equal(canEditDeliveryAddress(FULFILLMENT_STATUS.DELIVERED), false);
});

test("keeps seller shipment options focused on seller actions", () => {
  assert.ok(sellerShipmentStatusOptions.includes(FULFILLMENT_STATUS.SHIPPED));
  assert.ok(
    !sellerShipmentStatusOptions.includes(FULFILLMENT_STATUS.AWAITING_ADDRESS)
  );
});

test("extracts auction id from populated or raw fulfillment objects", () => {
  assert.equal(
    getAuctionIdFromFulfillment({ auction: { _id: "auction-1" } }),
    "auction-1"
  );
  assert.equal(getAuctionIdFromFulfillment({ auction: "auction-2" }), "auction-2");
});
