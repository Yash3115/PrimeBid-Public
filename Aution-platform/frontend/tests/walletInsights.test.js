import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWalletStatementCsv,
  filterWalletTransactions,
  getWalletTransactionMeta,
  summarizeWalletTransactions,
} from "../src/lib/walletInsights.js";

const transactions = [
  {
    _id: "t1",
    type: "TOP_UP",
    amount: 10000,
    status: "Completed",
    availableBefore: 0,
    availableAfter: 10000,
    lockedBefore: 0,
    lockedAfter: 0,
    createdAt: "2026-01-01T10:00:00.000Z",
    reference: "UPI demo",
  },
  {
    _id: "t2",
    type: "BID_LOCK",
    amount: 5000,
    status: "Completed",
    availableBefore: 10000,
    availableAfter: 5000,
    lockedBefore: 0,
    lockedAfter: 5000,
    createdAt: "2026-01-01T10:05:00.000Z",
    auction: { _id: "auction-1", title: "Camera" },
    note: "Bid locked",
  },
  {
    _id: "t3",
    type: "WITHDRAWAL_REQUEST",
    amount: 2000,
    status: "Pending",
    availableBefore: 5000,
    availableAfter: 3000,
    lockedBefore: 5000,
    lockedAfter: 7000,
    createdAt: "2026-01-01T10:10:00.000Z",
    withdrawal: { _id: "withdrawal-1", status: "Pending" },
  },
  {
    _id: "t4",
    type: "ESCROW_REFUND",
    amount: 5000,
    status: "Completed",
    availableBefore: 3000,
    availableAfter: 8000,
    lockedBefore: 7000,
    lockedAfter: 7000,
    createdAt: "2026-01-01T10:20:00.000Z",
    auction: { _id: "auction-1", title: "Camera" },
    note: "Admin refunded escrow",
  },
];

test("builds wallet transaction meta with linked auction context", () => {
  const meta = getWalletTransactionMeta(transactions[1]);

  assert.equal(meta.label, "Bid locked");
  assert.equal(meta.group, "locks");
  assert.equal(meta.auctionId, "auction-1");
  assert.equal(meta.availableDelta, -5000);
  assert.equal(meta.lockedDelta, 5000);
  assert.ok(meta.detail.includes("Camera"));
});

test("filters wallet transactions by operational group", () => {
  assert.equal(filterWalletTransactions(transactions, "all").length, 4);
  assert.equal(filterWalletTransactions(transactions, "credits").length, 2);
  assert.equal(filterWalletTransactions(transactions, "locks").length, 2);
  assert.equal(filterWalletTransactions(transactions, "withdrawals").length, 1);
  assert.equal(filterWalletTransactions(transactions, "settlements").length, 1);
});

test("summarizes recent wallet movement", () => {
  assert.deepEqual(summarizeWalletTransactions(transactions), {
    moneyIn: 15000,
    reserved: 7000,
    released: 0,
    settled: 0,
    withdrawalEvents: 1,
  });
});

test("exports wallet statement as csv", () => {
  const csv = buildWalletStatementCsv([transactions[0]]);

  assert.ok(csv.startsWith("Date,Type,Amount,Status"));
  assert.ok(csv.includes("Top up"));
  assert.ok(csv.includes("UPI demo"));
});
