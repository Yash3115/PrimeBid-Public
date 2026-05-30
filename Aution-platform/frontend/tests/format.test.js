import assert from "node:assert/strict";
import test from "node:test";
import { formatReviewCount, formatSellerRating } from "../src/lib/format.js";

test("shows no rating yet when a seller has no reviews", () => {
  assert.equal(
    formatSellerRating({ ratingAverage: 0, ratingCount: 0 }),
    "No rating yet"
  );
});

test("formats seller ratings only when reviews exist", () => {
  assert.equal(
    formatSellerRating({ ratingAverage: 4.6, ratingCount: 8 }),
    "4.6/5"
  );
  assert.equal(formatReviewCount(1), "1 review");
  assert.equal(formatReviewCount(8), "8 reviews");
});
