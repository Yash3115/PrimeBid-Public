import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBidLockDelta,
  canCoverBidLock,
  getWalletSnapshot,
  normalizeCommissionAmount,
} from "../utils/wallet.js";
import WalletTransaction from "../models/walletTransactionSchema.js";
import WithdrawalRequest from "../models/withdrawalRequestSchema.js";
import {
  buildEscrowSettlement,
  isActiveEscrowSettlement,
  refundEscrowToBuyer,
  releaseEscrowToSeller,
} from "../utils/escrowSettlement.js";
import { SETTLEMENT_STATUS } from "../utils/fulfillment.js";
import { buildWalletReconciliation } from "../utils/walletReconciliation.js";

test("builds a zero wallet snapshot for legacy users without wallet fields", () => {
  const snapshot = getWalletSnapshot({});

  assert.deepEqual(snapshot, {
    availableBalance: 0,
    lockedBalance: 0,
    lifetimeDeposited: 0,
    lifetimeWithdrawn: 0,
  });
});

test("calculates only the incremental lock needed for an increased bid", () => {
  const delta = calculateBidLockDelta(1500, 1000);

  assert.equal(delta.target, 1500);
  assert.equal(delta.current, 1000);
  assert.equal(delta.delta, 500);
  assert.equal(delta.release, 0);
});

test("calculates releasable amount when a target lock decreases", () => {
  const delta = calculateBidLockDelta(800, 1000);

  assert.equal(delta.delta, 0);
  assert.equal(delta.release, 200);
});

test("allows bidding when available wallet covers only the required delta", () => {
  const user = {
    wallet: {
      availableBalance: 250,
      lockedBalance: 1000,
    },
  };

  assert.equal(canCoverBidLock(user, 1200, 1000), true);
});

test("allows a bidder to increase a same-auction bid using their existing lock", () => {
  const user = {
    wallet: {
      availableBalance: 18689,
      lockedBalance: 81311,
    },
  };
  const delta = calculateBidLockDelta(81811, 81311);

  assert.equal(delta.delta, 500);
  assert.equal(canCoverBidLock(user, 81811, 81311), true);
});

test("blocks bidding when available wallet cannot cover the lock delta", () => {
  const user = {
    wallet: {
      availableBalance: 199,
      lockedBalance: 1000,
    },
  };

  assert.equal(canCoverBidLock(user, 1200, 1000), false);
});

test("normalizes platform commission so settlement cannot over-credit platform", () => {
  assert.equal(normalizeCommissionAmount(50, 1000), 50);
  assert.equal(normalizeCommissionAmount(1200, 1000), 1000);
  assert.equal(normalizeCommissionAmount(-20, 1000), 0);
  assert.equal(normalizeCommissionAmount("not-a-number", 1000), 0);
});

test("builds escrow settlement amounts before seller payout", () => {
  const settlement = buildEscrowSettlement({
    grossAmount: 10000,
    commissionAmount: 500,
    capturedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(settlement.escrowAmount, 10000);
  assert.equal(settlement.commissionAmount, 500);
  assert.equal(settlement.sellerPayoutAmount, 9500);
  assert.equal(settlement.capturedAt.toISOString(), "2026-01-01T00:00:00.000Z");
});

test("recognizes active escrow statuses", () => {
  assert.equal(isActiveEscrowSettlement(SETTLEMENT_STATUS.HELD_IN_ESCROW), true);
  assert.equal(isActiveEscrowSettlement(SETTLEMENT_STATUS.UNDER_DISPUTE), true);
  assert.equal(isActiveEscrowSettlement(SETTLEMENT_STATUS.RELEASED_TO_SELLER), false);
  assert.equal(isActiveEscrowSettlement(SETTLEMENT_STATUS.REFUNDED_TO_BUYER), false);
});

test("wallet transactions include escrow refund activity", () => {
  const typeEnum = WalletTransaction.schema.path("type").enumValues;

  assert.ok(typeEnum.includes("BID_CAPTURED"));
  assert.ok(typeEnum.includes("ESCROW_REFUND"));
  assert.ok(typeEnum.includes("SALE_CREDIT"));
});

test("wallet ledger models expose idempotency indexes", () => {
  const walletIndexes = WalletTransaction.schema.indexes();
  const withdrawalIndexes = WithdrawalRequest.schema.indexes();

  assert.ok(
    walletIndexes.some(
      ([fields, options]) =>
        fields.user === 1 &&
        fields.type === 1 &&
        fields.idempotencyKey === 1 &&
        options?.unique === true
    )
  );
  assert.ok(
    walletIndexes.some(
      ([fields, options]) =>
        fields.auction === 1 &&
        fields.type === 1 &&
        options?.unique === true
    )
  );
  assert.ok(
    withdrawalIndexes.some(
      ([fields, options]) =>
        fields.user === 1 &&
        fields.idempotencyKey === 1 &&
        options?.unique === true
    )
  );
});

test("settled escrow cannot be resolved in the opposite direction", async () => {
  await assert.rejects(
    () =>
      refundEscrowToBuyer({
        fulfillment: { settlementStatus: SETTLEMENT_STATUS.RELEASED_TO_SELLER },
      }),
    /already released/
  );
  await assert.rejects(
    () =>
      releaseEscrowToSeller({
        fulfillment: { settlementStatus: SETTLEMENT_STATUS.REFUNDED_TO_BUYER },
      }),
    /already refunded/
  );
});

test("wallet reconciliation flags locked balance mismatches", () => {
  const reconciliation = buildWalletReconciliation({
    walletTotals: { lockedBalance: 1500 },
    bidLockTotal: 800,
    pendingWithdrawalTotal: 500,
    activeEscrowTotal: 1200,
    platformSnapshot: { availableBalance: 300, lifetimeCommission: 300 },
    platformLedgerBalance: 300,
    platformCommissionLedger: 300,
  });

  assert.equal(reconciliation.healthy, false);
  assert.equal(reconciliation.walletLocked.expected, 1300);
  assert.equal(reconciliation.walletLocked.difference, 200);
  assert.equal(reconciliation.escrow.activeAmount, 1200);
  assert.equal(reconciliation.warnings.length, 1);
});
