import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../src/lib/authToken.js";

test("auth token helper stores and clears token in browser storage", () => {
  const storage = new Map();
  const originalWindow = globalThis.window;

  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };

  try {
    clearAuthToken();
    setAuthToken("demo-token");
    assert.equal(getAuthToken(), "demo-token");

    clearAuthToken();
    assert.equal(getAuthToken(), null);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});
