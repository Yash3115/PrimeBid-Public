import assert from "node:assert/strict";
import test from "node:test";

test("server app imports all route modules without startup export errors", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { default: app } = await import("../index.js");
    assert.equal(typeof app, "function");
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
