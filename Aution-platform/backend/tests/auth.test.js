import assert from "node:assert/strict";
import test from "node:test";
import { getRequestToken } from "../middlewares/auth.js";

const requestWith = ({ cookieToken, authorization } = {}) => ({
  cookies: cookieToken ? { token: cookieToken } : {},
  get(header) {
    return header.toLowerCase() === "authorization" ? authorization : "";
  },
});

test("auth middleware reads token from cookie first", () => {
  const token = getRequestToken(
    requestWith({
      cookieToken: "cookie-token",
      authorization: "Bearer header-token",
    })
  );

  assert.equal(token, "cookie-token");
});

test("auth middleware accepts bearer token fallback", () => {
  const token = getRequestToken(
    requestWith({
      authorization: "Bearer deployed-frontend-token",
    })
  );

  assert.equal(token, "deployed-frontend-token");
});

test("auth middleware ignores malformed authorization headers", () => {
  assert.equal(
    getRequestToken(requestWith({ authorization: "Token not-supported" })),
    null
  );
});
