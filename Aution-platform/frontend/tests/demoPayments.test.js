import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDemoPaymentReference,
  formatCardExpiry,
  formatCardNumber,
  maskCardNumber,
  maskUpiId,
  validateDemoPayment,
} from "../src/lib/demoPayments.js";

test("validates a UPI demo payment", () => {
  const result = validateDemoPayment({
    amount: 5000,
    paymentMethod: "UPI",
    upiId: "buyer@upi",
  });

  assert.equal(result.valid, true);
});

test("validates a card demo payment", () => {
  const result = validateDemoPayment({
    amount: 5000,
    paymentMethod: "Credit Card",
    cardName: "PrimeBid Buyer",
    cardNumber: "4111111111111111",
    cardExpiry: "12/40",
    cardCvv: "123",
  });

  assert.equal(result.valid, true);
});

test("rejects invalid card inputs", () => {
  const result = validateDemoPayment({
    amount: 0,
    paymentMethod: "Debit Card",
    cardName: "",
    cardNumber: "1234",
    cardExpiry: "01/20",
    cardCvv: "1",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.amount);
  assert.ok(result.errors.cardNumber);
  assert.ok(result.errors.cardExpiry);
});

test("formats and masks demo payment data", () => {
  assert.equal(formatCardNumber("4111111111111111"), "4111 1111 1111 1111");
  assert.equal(formatCardExpiry("1240"), "12/40");
  assert.equal(maskCardNumber("4111111111111111"), "**** **** **** 1111");
  assert.equal(maskUpiId("buyer@upi"), "bu***@upi");
});

test("builds a masked payment reference", () => {
  const reference = buildDemoPaymentReference(
    {
      paymentMethod: "UPI",
      upiId: "buyer@upi",
    },
    new Date("2026-05-30T10:11:12.000Z")
  );

  assert.equal(reference, "DEMO-UPI-20260530101112-bu***@upi");
});
