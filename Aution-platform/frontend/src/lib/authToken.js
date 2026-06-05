const AUTH_TOKEN_KEY = "primebid_auth_token";
const DEMO_AUTH_TOKEN_KEY = "primebid_demo_auth_token";
const ACTIVE_MODE_KEY = "primebid_active_mode";

export const AUTH_MODES = Object.freeze({
  PRODUCTION: "production",
  DEMO: "demo",
});

let memoryTokens = {
  [AUTH_MODES.PRODUCTION]: null,
  [AUTH_MODES.DEMO]: null,
};
let memoryActiveMode = null;

const getStorage = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  return null;
};

const normalizeMode = (mode) =>
  mode === AUTH_MODES.DEMO ? AUTH_MODES.DEMO : AUTH_MODES.PRODUCTION;

const getTokenKey = (mode) =>
  normalizeMode(mode) === AUTH_MODES.DEMO ? DEMO_AUTH_TOKEN_KEY : AUTH_TOKEN_KEY;

export const setActiveAuthMode = (mode) => {
  memoryActiveMode = normalizeMode(mode);
  const storage = getStorage();
  storage?.setItem(ACTIVE_MODE_KEY, memoryActiveMode);
  return memoryActiveMode;
};

export const getActiveAuthMode = () => {
  if (memoryActiveMode) return memoryActiveMode;
  const storage = getStorage();
  memoryActiveMode = normalizeMode(storage?.getItem(ACTIVE_MODE_KEY));
  return memoryActiveMode;
};

export const setAuthToken = (token, mode = AUTH_MODES.PRODUCTION) => {
  const normalizedMode = normalizeMode(mode);
  memoryTokens[normalizedMode] = token || null;
  const storage = getStorage();

  if (!storage) return;

  if (token) {
    storage.setItem(getTokenKey(normalizedMode), token);
  } else {
    storage.removeItem(getTokenKey(normalizedMode));
  }
};

export const getAuthToken = (mode = getActiveAuthMode()) => {
  const normalizedMode = normalizeMode(mode);
  if (memoryTokens[normalizedMode]) return memoryTokens[normalizedMode];

  const storage = getStorage();
  if (!storage) return null;

  memoryTokens[normalizedMode] = storage.getItem(getTokenKey(normalizedMode));
  return memoryTokens[normalizedMode];
};

export const clearAuthToken = (mode = getActiveAuthMode()) => {
  const normalizedMode = normalizeMode(mode);
  memoryTokens[normalizedMode] = null;
  const storage = getStorage();
  storage?.removeItem(getTokenKey(normalizedMode));
};

export const clearAllAuthTokens = () => {
  memoryTokens = {
    [AUTH_MODES.PRODUCTION]: null,
    [AUTH_MODES.DEMO]: null,
  };
  memoryActiveMode = AUTH_MODES.PRODUCTION;
  const storage = getStorage();
  storage?.removeItem(AUTH_TOKEN_KEY);
  storage?.removeItem(DEMO_AUTH_TOKEN_KEY);
  storage?.setItem(ACTIVE_MODE_KEY, AUTH_MODES.PRODUCTION);
};

export const activateBestAvailableMode = () => {
  if (getAuthToken(AUTH_MODES.PRODUCTION)) {
    return setActiveAuthMode(AUTH_MODES.PRODUCTION);
  }
  if (getAuthToken(AUTH_MODES.DEMO)) {
    return setActiveAuthMode(AUTH_MODES.DEMO);
  }
  return setActiveAuthMode(AUTH_MODES.PRODUCTION);
};
