import assert from "node:assert/strict";
import test from "node:test";
import {
  FULFILLMENT_STATUS,
  getFulfillmentProgress,
  normalizeDeliveryAddress,
  sellerManagedStatuses,
} from "../utils/fulfillment.js";

test("normalizes a complete delivery address", () => {
  const address = normalizeDeliveryAddress({
    fullName: "  Demo Bidder  ",
    phone: "+91 98765 43210",
    addressLine1: "  221B Demo Street ",
    city: " Delhi ",
    state: " Delhi ",
    postalCode: " 110001 ",
    instructions: " call before delivery ",
  });

  assert.deepEqual(address, {
    fullName: "Demo Bidder",
    phone: "+91 98765 43210",
    addressLine1: "221B Demo Street",
    addressLine2: "",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110001",
    country: "India",
    instructions: "call before delivery",
  });
});

test("rejects incomplete delivery addresses", () => {
  assert.throws(
    () => normalizeDeliveryAddress({ fullName: "Demo" }),
    /Delivery address missing/
  );
});

test("rejects invalid delivery phone numbers", () => {
  assert.throws(
    () =>
      normalizeDeliveryAddress({
        fullName: "Demo",
        phone: "12",
        addressLine1: "Street",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
      }),
    /phone number/
  );
});

test("tracks fulfillment progress and seller-managed statuses", () => {
  assert.equal(
    getFulfillmentProgress(FULFILLMENT_STATUS.OUT_FOR_DELIVERY).currentIndex,
    3
  );
  assert.equal(
    getFulfillmentProgress(FULFILLMENT_STATUS.ISSUE_REPORTED).isIssue,
    true
  );
  assert.ok(sellerManagedStatuses.includes(FULFILLMENT_STATUS.SHIPPED));
  assert.ok(!sellerManagedStatuses.includes(FULFILLMENT_STATUS.AWAITING_ADDRESS));
});
