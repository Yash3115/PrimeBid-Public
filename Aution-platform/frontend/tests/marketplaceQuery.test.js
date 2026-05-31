import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKETPLACE_DEFAULTS,
  marketplaceQueryFromSearchParams,
  marketplaceQueryToApiParams,
  setMarketplaceSearchParam,
} from "../src/lib/marketplaceQuery.js";

test("reads marketplace query state from URL search params", () => {
  const query = marketplaceQueryFromSearchParams(
    new URLSearchParams(
      "q=vintage&status=Live&category=Collectibles&condition=Used&sort=priceLow&minPrice=100&page=3&limit=24"
    )
  );

  assert.deepEqual(query, {
    q: "vintage",
    status: "Live",
    category: "Collectibles",
    condition: "Used",
    sort: "priceLow",
    minPrice: "100",
    maxPrice: "",
    page: 3,
    limit: 24,
  });
});

test("normalizes invalid URL values before using them", () => {
  const query = marketplaceQueryFromSearchParams(
    new URLSearchParams("status=Hidden&sort=bad&minPrice=-1&page=0")
  );

  assert.equal(query.status, MARKETPLACE_DEFAULTS.status);
  assert.equal(query.sort, MARKETPLACE_DEFAULTS.sort);
  assert.equal(query.minPrice, "");
  assert.equal(query.page, 1);
});

test("serializes only meaningful marketplace API params", () => {
  assert.deepEqual(
    marketplaceQueryToApiParams({
      ...MARKETPLACE_DEFAULTS,
      q: "watch",
      status: "Upcoming",
      page: 2,
    }),
    {
      page: 2,
      limit: 12,
      sort: "endingSoon",
      q: "watch",
      status: "Upcoming",
    }
  );
});

test("updates URL params and resets pagination when filters change", () => {
  const next = setMarketplaceSearchParam(
    new URLSearchParams("page=4&status=Live"),
    "category",
    "Electronics"
  );

  assert.equal(next.get("category"), "Electronics");
  assert.equal(next.get("status"), "Live");
  assert.equal(next.get("page"), null);
});
