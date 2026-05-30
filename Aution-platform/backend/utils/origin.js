const normalizeOrigin = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

export const getAllowedOrigins = () => [
  ...new Set([
    "https://primebid.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...parseOrigins(process.env.CLIENT_URL),
    ...parseOrigins(process.env.FRONTEND_URL),
  ]),
];

export const isAllowedOrigin = (origin) =>
  !origin || getAllowedOrigins().includes(normalizeOrigin(origin));
