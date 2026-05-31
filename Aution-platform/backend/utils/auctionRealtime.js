import { EventEmitter } from "node:events";
import { getAuctionTiming } from "./auctionStatus.js";

const auctionEvents = new EventEmitter();
auctionEvents.setMaxListeners(250);

const toId = (value) =>
  value?._id?.toString?.() || value?.toString?.() || "";

export const getAuctionBidVersion = (auction = {}) => {
  const version = Number(auction?.bidVersion || 0);
  return Number.isFinite(version) && version >= 0 ? version : 0;
};

export const bumpAuctionBidVersion = (auction, now = new Date()) => {
  if (!auction) return 0;
  auction.bidVersion = getAuctionBidVersion(auction) + 1;
  auction.lastBidAt = now;
  return auction.bidVersion;
};

export const buildAuctionSyncSnapshot = (auction, now = new Date()) => {
  const timing = getAuctionTiming(auction, now);
  const bids = Array.isArray(auction?.bids) ? auction.bids : [];
  const leadingBid = [...bids].sort(
    (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
  )[0];

  return {
    auctionId: toId(auction),
    bidVersion: getAuctionBidVersion(auction),
    currentBid: Number(auction?.currentBid || auction?.startingBid || 0),
    bidCount: bids.length,
    endTime: auction?.endTime ? new Date(auction.endTime).toISOString() : null,
    lastBidAt: auction?.lastBidAt
      ? new Date(auction.lastBidAt).toISOString()
      : null,
    leadingBidderId: toId(leadingBid?.userId),
    highestBidder: toId(auction?.highestBidder),
    closureStatus: auction?.closureStatus || "Open",
    closedAt: auction?.closedAt ? new Date(auction.closedAt).toISOString() : null,
    closureError: auction?.closureError || "",
    runtimeStatus: timing.runtimeStatus,
    isBiddable: timing.isBiddable,
    serverTime: timing.serverTime,
  };
};

export const hasAuctionChangedSince = (auction, knownBidVersion) => {
  if (knownBidVersion === undefined || knownBidVersion === null || knownBidVersion === "") {
    return true;
  }
  const expectedVersion = Number(knownBidVersion);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 0) return true;
  return getAuctionBidVersion(auction) !== expectedVersion;
};

export const publishAuctionEvent = (auctionId, event = {}) => {
  const id = toId(auctionId);
  if (!id) return;
  auctionEvents.emit(id, {
    type: event.type || "auction_sync",
    snapshot: event.snapshot || null,
    emittedAt: new Date().toISOString(),
  });
};

export const subscribeAuctionEvents = (auctionId, listener) => {
  const id = toId(auctionId);
  if (!id || typeof listener !== "function") return () => {};
  auctionEvents.on(id, listener);
  return () => auctionEvents.off(id, listener);
};
