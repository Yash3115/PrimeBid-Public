import dotenv from "dotenv";
import { connection, DATABASE_MODES } from "../db/connection.js";
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

dotenv.config();

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

const getScopedModel = (Model) => Model.__getScopedModel?.() || Model;

const listIndexes = async (collection) => {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.codeName === "NamespaceNotFound" || error?.code === 26) {
      return [];
    }
    throw error;
  }
};

const ensureDemoExpiresAtTtlIndex = async (Model) => {
  const ScopedModel = getScopedModel(Model);
  const { collection } = ScopedModel;
  const indexes = await listIndexes(collection);
  const existing = indexes.find((index) => index.name === "demoExpiresAt_1");

  if (existing && existing.expireAfterSeconds !== 0) {
    await collection.dropIndex(existing.name);
    console.log(`Dropped non-TTL demoExpiresAt_1 on ${collection.collectionName}`);
  }

  await collection.createIndex(
    { demoExpiresAt: 1 },
    { expireAfterSeconds: 0, name: "demoExpiresAt_1" }
  );
  console.log(`Ensured TTL demoExpiresAt_1 on ${collection.collectionName}`);
};

const ensurePlatformAccountSharedUniqueIndex = async () => {
  const ScopedModel = getScopedModel(PlatformAccount);
  const { collection } = ScopedModel;
  const indexes = await listIndexes(collection);
  const legacyKeyIndex = indexes.find((index) => index.name === "key_1");

  if (legacyKeyIndex) {
    await collection.dropIndex(legacyKeyIndex.name);
    console.log("Dropped legacy PlatformAccount key_1 unique index");
  }

  await collection.createIndex(
    { key: 1, isDemo: 1, demoSessionId: 1 },
    { unique: true, name: "key_1_isDemo_1_demoSessionId_1" }
  );
  console.log("Ensured shared PlatformAccount unique scope index");
};

let db;

try {
  db = await connection(DATABASE_MODES.PRODUCTION);

  for (const Model of demoScopedModels) {
    await ensureDemoExpiresAtTtlIndex(Model);
  }
  await ensurePlatformAccountSharedUniqueIndex();

  console.log("Shared demo indexes are ready.");
} catch (error) {
  console.error(`Shared demo index setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (db) {
    await db.close();
  }
}
