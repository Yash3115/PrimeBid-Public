import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKETPLACE_STATUS,
  buildMarketplacePagination,
  buildMarketplaceQuery,
  getMarketplaceSortQuery,
  getRuntimeStatusQuery,
} from "../utils/auctionMarketplace.js";

const now = new Date("2026-01-10T12:00:00.000Z");

test("builds a safe marketplace query from search filters", () => {
  const query = buildMarketplaceQuery(
    {
      q: "camera.*",
      status: "Live",
      category: "Electronics",
      condition: "Used",
      minPrice: "1000",
      maxPrice: "5000",
      page: "2",
      limit: "12",
      sort: "priceHigh",
    },
    now
  );

  assert.equal(query.page, 2);
  assert.equal(query.limit, 12);
  assert.equal(query.skip, 12);
  assert.equal(query.filters.status, MARKETPLACE_STATUS.LIVE);
  assert.equal(query.mongoQuery.category, "Electronics");
  assert.equal(query.mongoQuery.condition, "Used");
  assert.deepEqual(query.mongoQuery.currentBid, { $gte: 1000, $lte: 5000 });
  assert.deepEqual(query.mongoQuery.startTime, { $lte: now });
  assert.deepEqual(query.mongoQuery.endTime, { $gt: now });
  assert.equal(query.mongoQuery.$or.length, 4);
  assert.match(query.mongoQuery.$or[0].title.source, /camera/);
});

test("normalizes invalid marketplace params to safe defaults", () => {
  const query = buildMarketplaceQuery(
    {
      status: "Deleted",
      category: "Invalid",
      condition: "Broken",
      page: "-5",
      limit: "1000",
      minPrice: "9000",
      maxPrice: "3000",
      sort: "unknown",
    },
    now
  );

  assert.equal(query.page, 1);
  assert.equal(query.limit, 60);
  assert.equal(query.filters.status, MARKETPLACE_STATUS.ALL);
  assert.equal(query.filters.category, "");
  assert.equal(query.filters.condition, "");
  assert.equal(query.filters.minPrice, 3000);
  assert.equal(query.filters.maxPrice, 9000);
  assert.deepEqual(query.sortQuery, { endTime: 1, createdAt: -1 });
});

test("builds runtime status filters from server time", () => {
  assert.deepEqual(getRuntimeStatusQuery(MARKETPLACE_STATUS.UPCOMING, now), {
    startTime: { $gt: now },
  });
  assert.deepEqual(getRuntimeStatusQuery(MARKETPLACE_STATUS.ENDED, now), {
    endTime: { $lte: now },
  });
});

test("returns stable marketplace sort and pagination contracts", () => {
  assert.deepEqual(getMarketplaceSortQuery("quality"), {
    qualityScore: -1,
    endTime: 1,
  });
  assert.deepEqual(
    buildMarketplacePagination({ page: 2, limit: 12, totalItems: 25 }),
    {
      page: 2,
      limit: 12,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    }
  );
});
