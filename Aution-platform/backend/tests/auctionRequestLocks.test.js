import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireAuctionRequestLock,
  getAuctionRequestLockCount,
} from "../utils/auctionRequestLocks.js";

test("serializes mutations for the same auction", async () => {
  const order = [];
  const firstRelease = await acquireAuctionRequestLock("auction-1");
  order.push("first-acquired");

  const second = acquireAuctionRequestLock("auction-1").then((release) => {
    order.push("second-acquired");
    release();
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(order, ["first-acquired"]);

  firstRelease();
  await second;
  assert.deepEqual(order, ["first-acquired", "second-acquired"]);
  assert.equal(getAuctionRequestLockCount(), 0);
});

test("does not block unrelated auctions", async () => {
  const firstRelease = await acquireAuctionRequestLock("auction-a");
  const secondRelease = await acquireAuctionRequestLock("auction-b");

  assert.equal(getAuctionRequestLockCount(), 2);
  firstRelease();
  secondRelease();
  assert.equal(getAuctionRequestLockCount(), 0);
});
