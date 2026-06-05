import express from "express";
import { isAuth } from "../middlewares/auth.js";
import {
  requireDemoDatabase,
  requireProductionDatabase,
} from "../middlewares/database.js";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import {
  clearDemoAuthCookie,
  convertDemoWatchlist,
  endDemoSession,
  getDemoDashboardPath,
  issueDemoAuthToken,
  normalizeDemoPersona,
  startDemoSession,
  switchDemoPersona,
} from "../utils/demoMode.js";
import { isDemoModeEnabled } from "../utils/demoScope.js";

const router = express.Router();

const requireDemoMode = (req, res, next) => {
  if (isDemoModeEnabled()) return next();

  const err = new Error("Demo mode is unavailable because DEMO_MONGODB_URL is not configured");
  err.statusCode = 503;
  return next(err);
};

const serializeDemoUser = (user, demoSession, persona) => ({
  ...(user.toObject?.() || user),
  isDemo: true,
  demoSessionId: demoSession._id,
  demoExpiresAt: demoSession.expiresAt,
  demoPersona: persona,
});

router.get("/status", (req, res) => {
  const ttlHours = Number(process.env.DEMO_SESSION_TTL_HOURS || 24);
  return res.status(200).json({
    success: true,
    available: isDemoModeEnabled(),
    ttlHours: Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24,
    personas: ["Bidder", "Auctioneer", "Super Admin"],
    message: isDemoModeEnabled()
      ? "Demo Mode is available"
      : "Demo Mode is unavailable until DEMO_MONGODB_URL is configured",
  });
});

router.post(
  "/start",
  requireDemoMode,
  requireDemoDatabase,
  asyncErrorHandler(async (req, res) => {
    const { demoSession, user, persona, conversionToken } = await startDemoSession({
      req,
      persona: req.body?.persona,
    });
    const token = issueDemoAuthToken({ user, demoSession, persona, res });

    return res.status(201).json({
      success: true,
      message: "Demo Mode started",
      token,
      conversionToken,
      user: serializeDemoUser(user, demoSession, persona),
      demo: {
        sessionId: demoSession._id,
        expiresAt: demoSession.expiresAt,
        persona,
        dashboardPath: getDemoDashboardPath(persona),
        limitations:
          "Demo money, bids, auctions, shipments, and admin actions are sandbox-only and reset after 24 hours.",
      },
    });
  })
);

router.post(
  "/switch",
  requireDemoMode,
  requireDemoDatabase,
  isAuth,
  asyncErrorHandler(async (req, res, next) => {
    if (!req.isDemo) {
      const err = new Error("Persona switching is available only inside Demo Mode");
      err.statusCode = 403;
      return next(err);
    }

    const { demoSession, user, persona } = await switchDemoPersona({
      demoSessionId: req.demoSessionId,
      persona: req.body?.persona,
    });
    const token = issueDemoAuthToken({ user, demoSession, persona, res });

    return res.status(200).json({
      success: true,
      message: `Switched to ${persona}`,
      token,
      user: serializeDemoUser(user, demoSession, persona),
      demo: {
        sessionId: demoSession._id,
        expiresAt: demoSession.expiresAt,
        persona,
        dashboardPath: getDemoDashboardPath(persona),
      },
    });
  })
);

router.delete(
  "/session",
  requireDemoMode,
  requireDemoDatabase,
  isAuth,
  asyncErrorHandler(async (req, res) => {
    if (req.isDemo && req.demoSessionId) {
      await endDemoSession(req.demoSessionId);
    }
    clearDemoAuthCookie(res);
    return res.status(200).json({
      success: true,
      message: "Exited Demo Mode",
    });
  })
);

router.post(
  "/convert-watchlist",
  requireDemoMode,
  requireProductionDatabase,
  isAuth,
  asyncErrorHandler(async (req, res, next) => {
    if (req.isDemo) {
      const err = new Error("Create a real account before converting demo intent");
      err.statusCode = 403;
      return next(err);
    }

    const result = await convertDemoWatchlist({
      realUser: req.user,
      demoSessionId: req.body?.demoSessionId,
      conversionToken: req.body?.conversionToken,
    });

    return res.status(200).json({
      success: true,
      message:
        result.copiedCount > 0
          ? "Demo watchlist interests copied to your real account"
          : "No demo watchlist interests were available to copy",
      copiedCount: result.copiedCount,
      watchlist: result.watchlist,
      persona: normalizeDemoPersona(req.body?.persona),
    });
  })
);

export default router;
