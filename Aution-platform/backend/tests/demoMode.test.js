import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { DATABASE_MODES, getDatabaseUrl } from "../db/connection.js";
import Auction from "../models/auctionSchema.js";
import AuditLog from "../models/auditLogSchema.js";
import Bid from "../models/bidSchema.js";
import Commission from "../models/commissionSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import Notification from "../models/notificationSchema.js";
import Paymentproof from "../models/paymentproofSchema.js";
import PlatformAccount from "../models/platformAccountSchema.js";
import PlatformTransaction from "../models/platformTransactionSchema.js";
import Review from "../models/reviewSchema.js";
import User from "../models/userSchema.js";
import WalletTransaction from "../models/walletTransactionSchema.js";
import WithdrawalRequest from "../models/withdrawalRequestSchema.js";
import {
  DEMO_PERSONAS,
  getDemoDashboardPath,
  normalizeDemoPersona,
} from "../utils/demoMode.js";
import {
  getDemoScopeFilter,
  getDemoMaxSessionsPerSourcePerHour,
  getDemoSessionTtlHours,
  isDemoModeEnabled,
  runWithDemoScope,
} from "../utils/demoScope.js";

const demoScopedModels = [
  Auction,
  AuditLog,
  Bid,
  Commission,
  Fulfillment,
  Notification,
  Paymentproof,
  PlatformAccount,
  PlatformTransaction,
  Review,
  User,
  WalletTransaction,
  WithdrawalRequest,
];

test("normalizes demo personas and dashboard destinations", () => {
  assert.equal(normalizeDemoPersona("seller"), DEMO_PERSONAS.AUCTIONEER);
  assert.equal(normalizeDemoPersona("admin"), DEMO_PERSONAS.SUPER_ADMIN);
  assert.equal(normalizeDemoPersona("unknown"), DEMO_PERSONAS.BIDDER);

  assert.equal(getDemoDashboardPath("Bidder"), "/bidder-dashboard");
  assert.equal(getDemoDashboardPath("Auctioneer"), "/seller-dashboard");
  assert.equal(getDemoDashboardPath("Super Admin"), "/dashboard");
});

test("demo mode env helpers use the shared database and bounded defaults", () => {
  const originalMongoUrl = process.env.MONGODB_URL;
  const originalDemoDisabled = process.env.DEMO_DISABLED;
  const originalTtl = process.env.DEMO_SESSION_TTL_HOURS;
  const originalLimit = process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR;

  try {
    process.env.MONGODB_URL = "mongodb://localhost:27017/primebid_test";
    delete process.env.DEMO_DISABLED;
    process.env.DEMO_SESSION_TTL_HOURS = "6";
    process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = "3";

    assert.equal(isDemoModeEnabled(), true);
    assert.equal(
      getDatabaseUrl(DATABASE_MODES.DEMO),
      getDatabaseUrl(DATABASE_MODES.PRODUCTION)
    );
    assert.equal(getDemoSessionTtlHours(), 6);
    assert.equal(getDemoMaxSessionsPerSourcePerHour(), 3);

    process.env.DEMO_DISABLED = "true";
    process.env.DEMO_SESSION_TTL_HOURS = "-1";
    process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = "0";

    assert.equal(isDemoModeEnabled(), false);
    assert.equal(getDemoSessionTtlHours(), 24);
    assert.equal(getDemoMaxSessionsPerSourcePerHour(), 20);
  } finally {
    if (originalMongoUrl === undefined) delete process.env.MONGODB_URL;
    else process.env.MONGODB_URL = originalMongoUrl;
    if (originalDemoDisabled === undefined) delete process.env.DEMO_DISABLED;
    else process.env.DEMO_DISABLED = originalDemoDisabled;
    if (originalTtl === undefined) delete process.env.DEMO_SESSION_TTL_HOURS;
    else process.env.DEMO_SESSION_TTL_HOURS = originalTtl;
    if (originalLimit === undefined) delete process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR;
    else process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = originalLimit;
  }
});

test("demo scope filters isolate production and per-session demo records", async () => {
  assert.deepEqual(getDemoScopeFilter(), { isDemo: { $ne: true } });

  const sessionId = new mongoose.Types.ObjectId();
  const filter = await runWithDemoScope(
    {
      databaseMode: DATABASE_MODES.DEMO,
      isDemo: true,
      demoSessionId: sessionId,
      demoExpiresAt: new Date(Date.now() + 60000),
    },
    () => getDemoScopeFilter()
  );

  assert.equal(filter.isDemo, true);
  assert.equal(String(filter.demoSessionId), String(sessionId));
});

test("demo-scoped models declare TTL indexes for shared database cleanup", () => {
  for (const Model of demoScopedModels) {
    const hasTtlIndex = Model.schema.indexes().some(([fields, options]) => {
      return fields.demoExpiresAt === 1 && options?.expireAfterSeconds === 0;
    });
    assert.equal(hasTtlIndex, true, `${Model.modelName} must TTL demoExpiresAt`);
  }

  const hasPlatformScopeIndex = PlatformAccount.schema.indexes().some(
    ([fields, options]) =>
      fields.key === 1 &&
      fields.isDemo === 1 &&
      fields.demoSessionId === 1 &&
      options?.unique === true
  );
  assert.equal(hasPlatformScopeIndex, true);
});
