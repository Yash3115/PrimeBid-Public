export const AUCTION_RUNTIME_STATUS = Object.freeze({
  UPCOMING: "Upcoming",
  LIVE: "Live",
  ENDED: "Ended",
  INVALID: "Invalid",
});

const toTimeMs = (value) => {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const normalizeNowMs = (now) => {
  const ms = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
};

export const getAuctionTiming = (auction, now = new Date()) => {
  const nowMs = normalizeNowMs(now);
  const startMs = toTimeMs(auction?.startTime);
  const endMs = toTimeMs(auction?.endTime);
  const serverTime = new Date(nowMs).toISOString();

  if (startMs === null || endMs === null || endMs <= startMs) {
    return {
      runtimeStatus: AUCTION_RUNTIME_STATUS.INVALID,
      isBiddable: false,
      serverTime,
      startsAt: startMs === null ? null : new Date(startMs).toISOString(),
      endsAt: endMs === null ? null : new Date(endMs).toISOString(),
      timeUntilStartMs: null,
      timeUntilEndMs: null,
    };
  }

  let runtimeStatus = AUCTION_RUNTIME_STATUS.LIVE;
  if (nowMs < startMs) {
    runtimeStatus = AUCTION_RUNTIME_STATUS.UPCOMING;
  } else if (nowMs >= endMs) {
    runtimeStatus = AUCTION_RUNTIME_STATUS.ENDED;
  }

  return {
    runtimeStatus,
    isBiddable:
      runtimeStatus === AUCTION_RUNTIME_STATUS.LIVE &&
      auction?.status !== "Draft",
    serverTime,
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(endMs).toISOString(),
    timeUntilStartMs: Math.max(startMs - nowMs, 0),
    timeUntilEndMs: Math.max(endMs - nowMs, 0),
  };
};

export const withAuctionTiming = (auction, now = new Date()) => {
  const base =
    typeof auction?.toObject === "function"
      ? auction.toObject({ virtuals: true })
      : { ...(auction || {}) };
  delete base.autoBids;

  return {
    ...base,
    ...getAuctionTiming(auction, now),
  };
};

export const withAuctionTimings = (auctions, now = new Date()) =>
  (auctions || []).map((auction) => withAuctionTiming(auction, now));
