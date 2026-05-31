import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminActionQueue,
  buildAuctionRuntimeSummary,
  buildWalletTotals,
  countRowsById,
  sumRowsById,
} from "../utils/adminDashboard.js";

test("builds runtime auction summary from server time", () => {
  const now = new Date("2026-01-10T10:00:00.000Z");
  const auctions = [
    {
      status: "Published",
      startTime: "2026-01-10T11:00:00.000Z",
      endTime: "2026-01-10T12:00:00.000Z",
    },
    {
      status: "Published",
      startTime: "2026-01-10T09:00:00.000Z",
      endTime: "2026-01-10T11:00:00.000Z",
    },
    {
      status: "Published",
      startTime: "2026-01-10T08:00:00.000Z",
      endTime: "2026-01-10T09:00:00.000Z",
    },
    {
      status: "Draft",
      startTime: "2026-01-10T09:00:00.000Z",
      endTime: "2026-01-10T11:00:00.000Z",
    },
    {
      status: "Published",
      startTime: "not-a-date",
      endTime: "2026-01-10T11:00:00.000Z",
    },
  ];

  assert.deepEqual(buildAuctionRuntimeSummary(auctions, now), {
    total: 5,
    draft: 1,
    upcoming: 1,
    live: 1,
    ended: 1,
    invalid: 1,
    published: 4,
  });
});

test("builds admin action queue with only active work", () => {
  const queue = buildAdminActionQueue({
    pendingKyc: 2,
    pendingWithdrawals: 1,
    awaitingAddress: 0,
    readyToShip: 3,
    issueReported: 0,
    atRiskAuctions: 4,
  });

  assert.deepEqual(
    queue.map((item) => item.id),
    ["withdrawals", "kyc", "ready-to-ship", "auction-risk"]
  );
  assert.equal(queue[0].priority, "critical");
});

test("wallet reconciliation warnings lead the admin action queue", () => {
  const queue = buildAdminActionQueue({
    reconciliationWarnings: 2,
    pendingWithdrawals: 1,
  });

  assert.deepEqual(
    queue.map((item) => item.id),
    ["wallet-reconciliation", "withdrawals"]
  );
});

test("normalizes admin aggregate rows", () => {
  assert.deepEqual(countRowsById([{ _id: "Bidder", count: 3 }]), {
    Bidder: 3,
  });
  assert.deepEqual(
    sumRowsById([{ _id: "Pending", count: 2, amount: 7500 }]),
    {
      Pending: {
        count: 2,
        amount: 7500,
      },
    }
  );
});

test("builds wallet totals with numeric fallbacks", () => {
  assert.deepEqual(
    buildWalletTotals([
      {
        availableBalance: 1000,
        lockedBalance: 500,
        lifetimeDeposited: "2500",
        lifetimeWithdrawn: null,
      },
    ]),
    {
      availableBalance: 1000,
      lockedBalance: 500,
      lifetimeDeposited: 2500,
      lifetimeWithdrawn: 0,
    }
  );
});
