export const AUTH_SESSION_EXPIRED_EVENT = "primebid:auth-session-expired";

export const emitSessionExpired = (payload) => {
  if (typeof window === "undefined") return;

  const detail =
    typeof payload === "string"
      ? { message: payload }
      : payload || {};

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
      detail: {
        message: detail.message || "Session expired. Please login again",
        requestStartedAt: detail.requestStartedAt,
      },
    })
  );
};
