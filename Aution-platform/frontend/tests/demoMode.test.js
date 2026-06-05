import assert from "node:assert/strict";
import test from "node:test";
import {
  clearDemoConversion,
  getDemoConversion,
  getDemoDashboardPath,
  getDemoExpiryLabel,
  setDemoConversion,
} from "../src/lib/demoMode.js";
import {
  AUTH_MODES,
  clearAllAuthTokens,
  getActiveAuthMode,
  getAuthToken,
  setActiveAuthMode,
  setAuthToken,
} from "../src/lib/authToken.js";

test("demo helper maps personas to role dashboards", () => {
  assert.equal(getDemoDashboardPath("Bidder"), "/bidder-dashboard");
  assert.equal(getDemoDashboardPath("Auctioneer"), "/seller-dashboard");
  assert.equal(getDemoDashboardPath("Super Admin"), "/dashboard");
  assert.equal(getDemoDashboardPath("Unknown"), "/bidder-dashboard");
});

test("demo conversion storage saves and clears safe intent token", () => {
  const storage = new Map();
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };

  try {
    setDemoConversion({
      conversionToken: "conversion-token",
      demoSessionId: "session-id",
      persona: "Auctioneer",
    });

    assert.deepEqual(getDemoConversion(), {
      conversionToken: "conversion-token",
      demoSessionId: "session-id",
      persona: "Auctioneer",
    });

    clearDemoConversion();
    assert.equal(getDemoConversion().conversionToken, "");
    assert.equal(getDemoConversion().demoSessionId, "");
    assert.equal(getDemoConversion().persona, "Bidder");
  } finally {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }
  }
});

test("demo expiry labels are user-readable", () => {
  const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

  assert.match(getDemoExpiryLabel(threeHoursFromNow), /hours/);
  assert.match(getDemoExpiryLabel(tenMinutesFromNow), /minutes/);
  assert.equal(getDemoExpiryLabel("not-a-date"), "expires soon");
});

test("auth token helper keeps production and demo sessions separate", () => {
  const storage = new Map();
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };

  try {
    clearAllAuthTokens();
    setAuthToken("production-token", AUTH_MODES.PRODUCTION);
    setAuthToken("demo-token", AUTH_MODES.DEMO);

    setActiveAuthMode(AUTH_MODES.PRODUCTION);
    assert.equal(getActiveAuthMode(), AUTH_MODES.PRODUCTION);
    assert.equal(getAuthToken(), "production-token");

    setActiveAuthMode(AUTH_MODES.DEMO);
    assert.equal(getActiveAuthMode(), AUTH_MODES.DEMO);
    assert.equal(getAuthToken(), "demo-token");
    assert.equal(getAuthToken(AUTH_MODES.PRODUCTION), "production-token");
  } finally {
    clearAllAuthTokens();
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }
  }
});
