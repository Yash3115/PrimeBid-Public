import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPUTE_STATUS,
  FULFILLMENT_STATUS,
  SETTLEMENT_ACTION,
  getFulfillmentProgress,
  normalizeAdminDisputeReview,
  normalizeAdminSettlementReview,
  normalizeDeliveryAddress,
  normalizeDisputeReport,
  normalizeDisputeResponse,
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

test("normalizes buyer delivery issue reports", () => {
  const report = normalizeDisputeReport({
    issueType: "NotDelivered",
    description: "  Tracking says delivered but I did not receive it.  ",
  });

  assert.deepEqual(report, {
    issueType: "NotDelivered",
    description: "Tracking says delivered but I did not receive it.",
  });
});

test("rejects invalid or vague delivery issue reports", () => {
  assert.throws(
    () => normalizeDisputeReport({ issueType: "Unknown", description: "Valid enough text" }),
    /valid issue type/
  );
  assert.throws(
    () => normalizeDisputeReport({ issueType: "Other", description: "short" }),
    /at least 10 characters/
  );
});

test("normalizes seller dispute responses", () => {
  assert.deepEqual(
    normalizeDisputeResponse({
      sellerResponse: "  I contacted the courier and shared the corrected tracking. ",
    }),
    {
      sellerResponse: "I contacted the courier and shared the corrected tracking.",
    }
  );
  assert.throws(
    () => normalizeDisputeResponse({ sellerResponse: "too short" }),
    /at least 10 characters/
  );
});

test("requires admin resolution notes for final dispute decisions", () => {
  assert.deepEqual(
    normalizeAdminDisputeReview({
      status: DISPUTE_STATUS.NEEDS_MORE_INFO,
      adminResolution: "",
    }),
    {
      status: DISPUTE_STATUS.NEEDS_MORE_INFO,
      adminResolution: "",
      settlementAction: SETTLEMENT_ACTION.NONE,
      isFinal: false,
    }
  );
  assert.throws(
    () =>
      normalizeAdminDisputeReview({
        status: DISPUTE_STATUS.BUYER_FAVORED,
        adminResolution: "refund",
      }),
    /resolution note/
  );
  assert.equal(
    normalizeAdminDisputeReview({
      status: DISPUTE_STATUS.SELLER_FAVORED,
      adminResolution: "Courier proof confirms delivery to the address on file.",
      settlementAction: SETTLEMENT_ACTION.RELEASE_TO_SELLER,
    }).isFinal,
    true
  );
});

test("normalizes direct admin escrow settlement reviews", () => {
  assert.deepEqual(
    normalizeAdminSettlementReview({
      settlementAction: SETTLEMENT_ACTION.RELEASE_TO_SELLER,
      adminResolution: "Buyer did not respond after delivery proof window.",
    }),
    {
      settlementAction: SETTLEMENT_ACTION.RELEASE_TO_SELLER,
      adminResolution: "Buyer did not respond after delivery proof window.",
    }
  );
  assert.throws(
    () =>
      normalizeAdminSettlementReview({
        settlementAction: SETTLEMENT_ACTION.NONE,
        adminResolution: "Hold",
      }),
    /release escrow or refund/
  );
  assert.throws(
    () =>
      normalizeAdminSettlementReview({
        settlementAction: SETTLEMENT_ACTION.REFUND_BUYER,
        adminResolution: "refund",
      }),
    /admin note/
  );
});
