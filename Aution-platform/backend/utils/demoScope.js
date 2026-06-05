import { AsyncLocalStorage } from "async_hooks";
import mongoose from "mongoose";
import {
  DATABASE_MODES,
  getConnectionInstance,
  isDemoDatabaseAvailable,
  normalizeDatabaseMode,
} from "../db/connection.js";

const demoScopeStorage = new AsyncLocalStorage();

const toObjectId = (value) => {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return undefined;
};

export const isDemoModeEnabled = () => isDemoDatabaseAvailable();

export const getDemoSessionTtlHours = () => {
  const hours = Number(process.env.DEMO_SESSION_TTL_HOURS || 24);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
};

export const getDemoMaxSessionsPerSourcePerHour = () => {
  const limit = Number(process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR || 20);
  return Number.isFinite(limit) && limit > 0 ? limit : 20;
};

export const createDemoRequestContext = (req, res, next) => {
  demoScopeStorage.run(
    {
      databaseMode: DATABASE_MODES.PRODUCTION,
      isDemo: false,
      demoSessionId: null,
      demoExpiresAt: null,
      bypassDemoScope: false,
    },
    next
  );
};

export const getDemoScope = () => demoScopeStorage.getStore() || {};

export const getDatabaseMode = () =>
  normalizeDatabaseMode(getDemoScope().databaseMode);

export const setDatabaseMode = (mode) => {
  const store = demoScopeStorage.getStore();
  if (!store) return;
  store.databaseMode = normalizeDatabaseMode(mode);
};

export const getScopedConnection = () => getConnectionInstance(getDatabaseMode());

export const setDemoScope = ({ isDemo, demoSessionId, demoExpiresAt }) => {
  const store = demoScopeStorage.getStore();
  if (!store) return;

  store.databaseMode = isDemo ? DATABASE_MODES.DEMO : DATABASE_MODES.PRODUCTION;
  store.isDemo = Boolean(isDemo);
  store.demoSessionId = demoSessionId ? String(demoSessionId) : null;
  store.demoExpiresAt = demoExpiresAt ? new Date(demoExpiresAt) : null;
};

export const clearDemoScope = () => {
  const store = demoScopeStorage.getStore();
  if (!store) return;

  store.databaseMode = DATABASE_MODES.PRODUCTION;
  store.isDemo = false;
  store.demoSessionId = null;
  store.demoExpiresAt = null;
};

export const runWithDemoScope = (scope, operation) =>
  demoScopeStorage.run(
    {
      databaseMode: normalizeDatabaseMode(
        scope?.databaseMode || (scope?.isDemo ? DATABASE_MODES.DEMO : getDatabaseMode())
      ),
      isDemo: Boolean(scope?.isDemo),
      demoSessionId: scope?.demoSessionId ? String(scope.demoSessionId) : null,
      demoExpiresAt: scope?.demoExpiresAt ? new Date(scope.demoExpiresAt) : null,
      bypassDemoScope: Boolean(scope?.bypassDemoScope),
    },
    operation
  );

export const runWithoutDemoScope = (operation) =>
  runWithDemoScope(
    { databaseMode: getDatabaseMode(), bypassDemoScope: true },
    operation
  );

export const runWithDatabaseMode = (databaseMode, operation, options = {}) =>
  runWithDemoScope(
    {
      databaseMode,
      isDemo: options.isDemo,
      demoSessionId: options.demoSessionId,
      demoExpiresAt: options.demoExpiresAt,
      bypassDemoScope: options.bypassDemoScope,
    },
    operation
  );

export const runWithDemoDatabase = (operation, options = {}) =>
  runWithDatabaseMode(DATABASE_MODES.DEMO, operation, options);

export const runWithProductionDatabase = (operation, options = {}) =>
  runWithDatabaseMode(DATABASE_MODES.PRODUCTION, operation, options);

export const getCurrentDemoMetadata = () => {
  const scope = getDemoScope();
  if (!scope.isDemo || !scope.demoSessionId) return {};

  return {
    isDemo: true,
    demoSessionId: toObjectId(scope.demoSessionId),
    demoExpiresAt: scope.demoExpiresAt ? new Date(scope.demoExpiresAt) : undefined,
  };
};

export const getDemoScopeFilter = () => {
  const scope = getDemoScope();
  if (scope.bypassDemoScope) return {};

  if (scope.isDemo && scope.demoSessionId) {
    return {
      isDemo: true,
      demoSessionId: toObjectId(scope.demoSessionId),
    };
  }

  return getDatabaseMode() === DATABASE_MODES.DEMO
    ? { isDemo: true }
    : { isDemo: { $ne: true } };
};

export const attachDemoMetadata = (doc) => {
  const metadata = getCurrentDemoMetadata();
  if (!metadata.isDemo || !doc) return;

  if (doc.isDemo !== true) {
    doc.isDemo = true;
  }
  if (!doc.demoSessionId) {
    doc.demoSessionId = metadata.demoSessionId;
  }
  if (!doc.demoExpiresAt && metadata.demoExpiresAt) {
    doc.demoExpiresAt = metadata.demoExpiresAt;
  }
};

export const assertDemoDocumentAccess = (req, doc, label = "Record") => {
  if (!doc) return;

  const requestIsDemo = Boolean(req?.isDemo);
  const documentIsDemo = Boolean(doc.isDemo);

  if (!requestIsDemo && documentIsDemo) {
    const err = new Error(`${label} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (requestIsDemo) {
    const requestSession = req.demoSessionId?.toString?.() || String(req.demoSessionId || "");
    const documentSession =
      doc.demoSessionId?.toString?.() || String(doc.demoSessionId || "");
    if (!documentIsDemo || !requestSession || requestSession !== documentSession) {
      const err = new Error(`${label} not found`);
      err.statusCode = 404;
      throw err;
    }
  }
};
