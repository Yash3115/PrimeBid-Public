import jwt from "jsonwebtoken";
import {
  connection,
  DATABASE_MODES,
  getConnectionStatus,
  isDemoDatabaseAvailable,
  normalizeDatabaseMode,
} from "../db/connection.js";
import { setDatabaseMode } from "../utils/demoScope.js";

const getRequestToken = (req) => {
  const authorization = req.get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  if (req.cookies?.token) return req.cookies.token;
  return null;
};

export const getRequestDatabaseMode = (req, fallbackMode = DATABASE_MODES.PRODUCTION) => {
  const token = getRequestToken(req);
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.mode === DATABASE_MODES.DEMO || decoded?.isDemo) {
        return DATABASE_MODES.DEMO;
      }
      return DATABASE_MODES.PRODUCTION;
    } catch {
      return fallbackMode;
    }
  }

  return normalizeDatabaseMode(fallbackMode);
};

export const requireDatabaseConnection =
  (fallbackMode = DATABASE_MODES.PRODUCTION) =>
  async (req, res, next) => {
    const mode = getRequestDatabaseMode(req, fallbackMode);
    setDatabaseMode(mode);

    try {
      await connection(mode);
      next();
    } catch (error) {
      console.error(
        `${mode === DATABASE_MODES.DEMO ? "Demo database" : "Database"} unavailable for request:`,
        error.message
      );
      const err = new Error(
        mode === DATABASE_MODES.DEMO
          ? "Demo database is temporarily unavailable. Please try again later."
          : "Database temporarily unavailable. Please try again later."
      );
      err.statusCode = 503;
      next(err);
    }
  };

export const forceDatabaseConnection =
  (mode = DATABASE_MODES.PRODUCTION) =>
  async (req, res, next) => {
    const normalizedMode = normalizeDatabaseMode(mode);
    setDatabaseMode(normalizedMode);

    try {
      await connection(normalizedMode);
      next();
    } catch (error) {
      console.error(
        `${normalizedMode === DATABASE_MODES.DEMO ? "Demo database" : "Database"} unavailable for request:`,
        error.message
      );
      const err = new Error(
        normalizedMode === DATABASE_MODES.DEMO
          ? "Demo database is temporarily unavailable. Please try again later."
          : "Database temporarily unavailable. Please try again later."
      );
      err.statusCode = 503;
      next(err);
    }
  };

export const requireProductionDatabase = forceDatabaseConnection(
  DATABASE_MODES.PRODUCTION
);

export const requireDemoDatabase = (req, res, next) => {
  if (!isDemoDatabaseAvailable()) {
    const err = new Error("Demo mode is unavailable because DEMO_MONGODB_URL is not configured");
    err.statusCode = 503;
    return next(err);
  }
  return forceDatabaseConnection(DATABASE_MODES.DEMO)(req, res, next);
};

export const getReadinessSnapshot = () => ({
  production: getConnectionStatus(DATABASE_MODES.PRODUCTION),
  demo: {
    ...getConnectionStatus(DATABASE_MODES.DEMO),
    available: isDemoDatabaseAvailable(),
  },
});
