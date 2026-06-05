import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_PERSONAS,
  getDemoDashboardPath,
  normalizeDemoPersona,
} from "../utils/demoMode.js";
import {
  getDemoMaxSessionsPerSourcePerHour,
  getDemoSessionTtlHours,
  isDemoModeEnabled,
} from "../utils/demoScope.js";

test("normalizes demo personas and dashboard destinations", () => {
  assert.equal(normalizeDemoPersona("seller"), DEMO_PERSONAS.AUCTIONEER);
  assert.equal(normalizeDemoPersona("admin"), DEMO_PERSONAS.SUPER_ADMIN);
  assert.equal(normalizeDemoPersona("unknown"), DEMO_PERSONAS.BIDDER);

  assert.equal(getDemoDashboardPath("Bidder"), "/bidder-dashboard");
  assert.equal(getDemoDashboardPath("Auctioneer"), "/seller-dashboard");
  assert.equal(getDemoDashboardPath("Super Admin"), "/dashboard");
});

test("demo mode env helpers stay explicit and bounded", () => {
  const originalEnabled = process.env.DEMO_MODE_ENABLED;
  const originalTtl = process.env.DEMO_SESSION_TTL_HOURS;
  const originalLimit = process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR;

  try {
    process.env.DEMO_MODE_ENABLED = "true";
    process.env.DEMO_SESSION_TTL_HOURS = "6";
    process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = "3";

    assert.equal(isDemoModeEnabled(), true);
    assert.equal(getDemoSessionTtlHours(), 6);
    assert.equal(getDemoMaxSessionsPerSourcePerHour(), 3);

    process.env.DEMO_MODE_ENABLED = "false";
    process.env.DEMO_SESSION_TTL_HOURS = "-1";
    process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = "0";

    assert.equal(isDemoModeEnabled(), false);
    assert.equal(getDemoSessionTtlHours(), 24);
    assert.equal(getDemoMaxSessionsPerSourcePerHour(), 20);
  } finally {
    if (originalEnabled === undefined) delete process.env.DEMO_MODE_ENABLED;
    else process.env.DEMO_MODE_ENABLED = originalEnabled;
    if (originalTtl === undefined) delete process.env.DEMO_SESSION_TTL_HOURS;
    else process.env.DEMO_SESSION_TTL_HOURS = originalTtl;
    if (originalLimit === undefined) delete process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR;
    else process.env.DEMO_MAX_SESSIONS_PER_IP_PER_HOUR = originalLimit;
  }
});
