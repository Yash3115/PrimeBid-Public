import assert from "node:assert/strict";
import test from "node:test";
import Commission from "../models/commissionSchema.js";
import PlatformTransaction from "../models/platformTransactionSchema.js";
import { getPlatformSnapshot } from "../utils/platformAccount.js";

test("builds platform account snapshot with safe zero defaults", () => {
  const snapshot = getPlatformSnapshot({});

  assert.deepEqual(snapshot, {
    availableBalance: 0,
    lifetimeCommission: 0,
    lifetimeManualCommission: 0,
    lifetimeWithdrawn: 0,
  });
});

test("commission model defaults to wallet-settlement platform transfers", () => {
  const paths = Commission.schema.paths;

  assert.ok(paths.platformAccount);
  assert.ok(paths.platformTransaction);
  assert.ok(paths.collectionMethod.enumValues.includes("WalletSettlement"));
  assert.equal(paths.collectionMethod.defaultValue, "WalletSettlement");
  assert.ok(paths.status.enumValues.includes("Collected"));
});

test("platform transaction model has idempotency indexes for commission credits", () => {
  const indexes = PlatformTransaction.schema.indexes();

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.auction === 1 &&
        fields.type === 1 &&
        options?.unique === true
    )
  );
  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.paymentProof === 1 &&
        fields.type === 1 &&
        options?.unique === true
    )
  );
});
