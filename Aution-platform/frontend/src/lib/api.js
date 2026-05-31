import axios from "axios";
import { toast } from "react-toastify";
import { emitSessionExpired } from "./authEvents";
import { getAuthToken } from "./authToken";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const normalizeLocalApiBaseUrl = (baseUrl) => {
  if (!import.meta.env.DEV || typeof window === "undefined" || !baseUrl) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    const frontendHost = window.location.hostname;
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

    if (loopbackHosts.has(url.hostname) && loopbackHosts.has(frontendHost)) {
      url.hostname = frontendHost;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return baseUrl;
  }

  return baseUrl;
};

export const API_BASE_URL =
  normalizeLocalApiBaseUrl(configuredApiBaseUrl) ||
  (import.meta.env.DEV
    ? normalizeLocalApiBaseUrl("http://localhost:8000/api/v1")
    : "/api/v1");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    if (typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  config.metadata = {
    ...config.metadata,
    requestStartedAt: Date.now(),
  };
  return config;
});

const AUTH_SESSION_MESSAGES = [
  "session expired",
  "invalid token",
  "user account no longer exists",
];

export const isAuthSessionError = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "");

  return (
    status === 401 &&
    AUTH_SESSION_MESSAGES.some((sessionMessage) =>
      message.toLowerCase().includes(sessionMessage)
    )
  );
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAuthSessionError(error)) {
      error.isAuthSessionError = true;
      emitSessionExpired({
        message: getErrorMessage(error, "Session expired. Please login again"),
        requestStartedAt: error.config?.metadata?.requestStartedAt,
      });
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

export const toastApiError = (error, fallback) => {
  if (error?.isAuthSessionError || isAuthSessionError(error)) return;

  toast.error(getErrorMessage(error, fallback));
};
