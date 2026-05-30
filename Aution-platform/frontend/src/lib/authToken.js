const AUTH_TOKEN_KEY = "primebid_auth_token";

let memoryToken = null;

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

export const setAuthToken = (token) => {
  memoryToken = token || null;
  const storage = getStorage();

  if (!storage) return;

  if (token) {
    storage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    storage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getAuthToken = () => {
  if (memoryToken) return memoryToken;

  const storage = getStorage();
  if (!storage) return null;

  memoryToken = storage.getItem(AUTH_TOKEN_KEY);
  return memoryToken;
};

export const clearAuthToken = () => {
  memoryToken = null;
  const storage = getStorage();
  storage?.removeItem(AUTH_TOKEN_KEY);
};
