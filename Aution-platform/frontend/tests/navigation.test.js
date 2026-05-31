import assert from "node:assert/strict";
import test from "node:test";
import {
  getHashTargetId,
  getSafeRedirectPath,
} from "../src/lib/navigation.js";

test("keeps post-auth redirects inside the app", () => {
  assert.equal(
    getSafeRedirectPath("/auction/item/abc123?ref=login#bid"),
    "/auction/item/abc123?ref=login#bid"
  );
  assert.equal(getSafeRedirectPath("https://evil.example/login"), "/");
  assert.equal(getSafeRedirectPath("//evil.example/login"), "/");
  assert.equal(getSafeRedirectPath(""), "/");
});

test("decodes route hash targets for delayed section scrolling", () => {
  assert.equal(getHashTargetId("#fulfillment"), "fulfillment");
  assert.equal(getHashTargetId("#escrow%20settlements"), "escrow settlements");
  assert.equal(getHashTargetId(""), "");
});
