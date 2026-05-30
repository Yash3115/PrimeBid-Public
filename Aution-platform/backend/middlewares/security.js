import { isAllowedOrigin } from "../utils/origin.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
};

export const requireTrustedOrigin = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (isAllowedOrigin(origin)) return next();

  const err = new Error("Request origin is not allowed");
  err.statusCode = 403;
  return next(err);
};
