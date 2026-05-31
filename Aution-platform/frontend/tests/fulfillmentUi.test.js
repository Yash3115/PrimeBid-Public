import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPUTE_STATUS,
  FULFILLMENT_STATUS,
  SETTLEMENT_STATUS,
  canEditDeliveryAddress,
  canConfirmDelivery,
  canAdminSettleEscrow,
  disputeIssueTypeOptions,
  getAuctionIdFromFulfillment,
  getDisputeLabel,
  getDisputeTone,
  getFulfillmentLabel,
  getFulfillmentTone,
  getIssueTypeLabel,
  getSettlementLabel,
  getSettlementTone,
  hasActiveEscrow,
  hasOpenDispute,
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

test("formats delivery dispute status and issue labels", () => {
  assert.equal(getDisputeLabel(DISPUTE_STATUS.SELLER_RESPONDED), "Seller responded");
  assert.ok(getDisputeTone(DISPUTE_STATUS.OPEN).includes("red"));
  assert.equal(getIssueTypeLabel("DamagedItem"), "Item arrived damaged");
  assert.equal(getIssueTypeLabel("Missing"), "Delivery issue");
});

test("detects open disputes and exposes buyer issue options", () => {
  assert.equal(hasOpenDispute({ dispute: { isOpen: true } }), true);
  assert.equal(hasOpenDispute({ dispute: { isOpen: false } }), false);
  assert.ok(
    disputeIssueTypeOptions.some((option) => option.value === "SellerUnresponsive")
  );
});

test("formats escrow settlement labels and confirmation state", () => {
  assert.equal(
    getSettlementLabel(SETTLEMENT_STATUS.HELD_IN_ESCROW),
    "Held in escrow"
  );
  assert.ok(getSettlementTone(SETTLEMENT_STATUS.UNDER_DISPUTE).includes("red"));
  assert.equal(
    hasActiveEscrow({ settlementStatus: SETTLEMENT_STATUS.READY_TO_RELEASE }),
    true
  );
  assert.equal(
    canConfirmDelivery({
      status: FULFILLMENT_STATUS.DELIVERED,
      settlementStatus: SETTLEMENT_STATUS.READY_TO_RELEASE,
    }),
    true
  );
  assert.equal(
    canConfirmDelivery({
      status: FULFILLMENT_STATUS.DELIVERED,
      settlementStatus: SETTLEMENT_STATUS.UNDER_DISPUTE,
      dispute: { isOpen: true },
    }),
    false
  );
});

test("allows admin escrow settlement only when captured funds are actionable", () => {
  assert.equal(
    canAdminSettleEscrow({
      settlementStatus: SETTLEMENT_STATUS.READY_TO_RELEASE,
      settlement: { escrowAmount: 10000 },
    }),
    true
  );
  assert.equal(
    canAdminSettleEscrow({
      settlementStatus: SETTLEMENT_STATUS.NEEDS_REVIEW,
      winningAmount: 10000,
    }),
    false
  );
  assert.equal(
    canAdminSettleEscrow({
      settlementStatus: SETTLEMENT_STATUS.HELD_IN_ESCROW,
      winningAmount: 10000,
    }),
    false
  );
  assert.equal(
    canAdminSettleEscrow({
      settlementStatus: SETTLEMENT_STATUS.READY_TO_RELEASE,
      settlement: { escrowAmount: 10000 },
      dispute: { isOpen: true },
    }),
    false
  );
});
