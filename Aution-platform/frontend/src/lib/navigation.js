export const getSafeRedirectPath = (from, fallback = "/") => {
  if (typeof from !== "string" || !from.trim()) return fallback;

  const candidate = from.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  try {
    const url = new URL(candidate, "https://primebid.local");
    if (url.origin !== "https://primebid.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

export const getHashTargetId = (hash) => {
  if (typeof hash !== "string" || !hash.startsWith("#") || hash.length <= 1) {
    return "";
  }

  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
};
