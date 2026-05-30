import assert from "node:assert/strict";
import test from "node:test";
import { getAllowedOrigins, isAllowedOrigin } from "../utils/origin.js";

test("allows local frontend and same-origin/server-to-server requests", () => {
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin("http://localhost:5173"), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:5173"), true);
});

test("uses configured comma-separated frontend origins", () => {
  const originalClientUrl = process.env.CLIENT_URL;
  process.env.CLIENT_URL = "https://demo.example.com/, https://admin.example.com ";

  try {
    const origins = getAllowedOrigins();

    assert.ok(origins.includes("https://demo.example.com"));
    assert.ok(origins.includes("https://admin.example.com"));
    assert.equal(isAllowedOrigin("https://demo.example.com"), true);
    assert.equal(isAllowedOrigin("https://demo.example.com/"), true);
    assert.equal(isAllowedOrigin("https://evil.example.com"), false);
  } finally {
    if (originalClientUrl === undefined) {
      delete process.env.CLIENT_URL;
    } else {
      process.env.CLIENT_URL = originalClientUrl;
    }
  }
});
