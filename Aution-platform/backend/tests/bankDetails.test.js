import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWithdrawalBankSnapshot,
  hasCompleteBankDetails,
  validateBankTransferDetails,
} from "../utils/bankDetails.js";

test("uses saved bank details for withdrawal snapshots when complete", () => {
  const snapshot = buildWithdrawalBankSnapshot({
    savedBankDetails: {
      bankName: "HDFC Bank",
      bankAccountName: "Demo Auctioneer",
      bankAccountNumber: " PBDEMOAUCT0002 ",
      bankIFSCCode: "hdfc0001234",
    },
    requestBody: {
      bankName: "Other Bank",
      bankAccountName: "Other User",
      bankAccountNumber: "OTHER00001",
      bankIFSCCode: "ICIC0001234",
    },
  });

  assert.equal(snapshot.bankName, "HDFC Bank");
  assert.equal(snapshot.bankAccountNumber, "PBDEMOAUCT0002");
  assert.equal(snapshot.bankIFSCCode, "HDFC0001234");
});

test("falls back to request bank details when no saved account exists", () => {
  const snapshot = buildWithdrawalBankSnapshot({
    savedBankDetails: {},
    requestBody: {
      bankName: "State Bank",
      bankAccountName: "Demo Bidder",
      bankAccountNumber: " 1234567890 ",
      bankIFSCCode: "sbin0005678",
    },
  });

  assert.deepEqual(snapshot, {
    bankName: "State Bank",
    bankAccountName: "Demo Bidder",
    bankAccountNumber: "1234567890",
    bankIFSCCode: "SBIN0005678",
  });
});

test("falls back to request bank details when saved details are invalid", () => {
  const snapshot = buildWithdrawalBankSnapshot({
    savedBankDetails: {
      bankName: "Old Bank",
      bankAccountName: "Old User",
      bankAccountNumber: "12",
      bankIFSCCode: "BAD",
    },
    requestBody: {
      bankName: "State Bank",
      bankAccountName: "Demo Bidder",
      bankAccountNumber: "1234567890",
      bankIFSCCode: "SBIN0005678",
    },
  });

  assert.equal(snapshot.bankName, "State Bank");
  assert.equal(snapshot.bankAccountNumber, "1234567890");
  assert.equal(snapshot.bankIFSCCode, "SBIN0005678");
});

test("validates complete bank details", () => {
  const result = validateBankTransferDetails({
    bankName: "Axis Bank",
    bankAccountName: "PrimeBid Buyer",
    bankAccountNumber: "123456789012",
    bankIFSCCode: "UTIB0000123",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("rejects missing or malformed withdrawal bank details", () => {
  const result = validateBankTransferDetails({
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "12",
    bankIFSCCode: "BAD",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.bankName);
  assert.ok(result.errors.bankAccountName);
  assert.ok(result.errors.bankAccountNumber);
  assert.ok(result.errors.bankIFSCCode);
  assert.equal(hasCompleteBankDetails(result.details), false);
});
