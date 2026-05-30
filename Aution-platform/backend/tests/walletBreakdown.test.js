import assert from "node:assert/strict";
import test from "node:test";
import { buildWalletLockBreakdown } from "../utils/walletBreakdown.js";

test("summarizes bid and withdrawal locked funds", () => {
  const breakdown = buildWalletLockBreakdown({
    wallet: { lockedBalance: 1500 },
    bidLocks: [{ amount: 1000 }],
    withdrawalLocks: [{ amount: 500 }],
  });

  assert.equal(breakdown.totalLocked, 1500);
  assert.equal(breakdown.bidLockedTotal, 1000);
  assert.equal(breakdown.withdrawalLockedTotal, 500);
  assert.equal(breakdown.knownLockedTotal, 1500);
  assert.equal(breakdown.unmatchedAmount, 0);
  assert.equal(breakdown.hasLockedFunds, true);
});

test("reports unmatched locked balance for old or inconsistent wallet data", () => {
  const breakdown = buildWalletLockBreakdown({
    wallet: { lockedBalance: 2000 },
    bidLocks: [{ amount: 750 }],
    withdrawalLocks: [],
  });

  assert.equal(breakdown.knownLockedTotal, 750);
  assert.equal(breakdown.unmatchedAmount, 1250);
});

test("never reports known locked total above wallet locked balance", () => {
  const breakdown = buildWalletLockBreakdown({
    wallet: { lockedBalance: 500 },
    bidLocks: [{ amount: 600 }],
    withdrawalLocks: [{ amount: 100 }],
  });

  assert.equal(breakdown.knownLockedTotal, 500);
  assert.equal(breakdown.unmatchedAmount, 0);
});
