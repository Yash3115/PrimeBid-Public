import { AUCTION_CATEGORIES, AUCTION_CONDITIONS } from "../constants/auctionOptions.js";

export const MARKETPLACE_STATUS = Object.freeze({
  ALL: "All",
  LIVE: "Live",
  UPCOMING: "Upcoming",
  ENDED: "Ended",
});

export const MARKETPLACE_SORTS = Object.freeze({
  ENDING_SOON: "endingSoon",
  NEWEST: "newest",
  PRICE_HIGH: "priceHigh",
  PRICE_LOW: "priceLow",
  QUALITY: "quality",
});

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanText = (value, maxLength = 80) =>
  String(value || "").trim().slice(0, maxLength);

const cleanChoice = (value, allowedValues, fallback = null) => {
  const normalized = cleanText(value);
  const match = allowedValues.find(
    (item) => item.toLowerCase() === normalized.toLowerCase()
  );
  return match || fallback;
};

const parsePositiveInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
};

const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
};

export const getRuntimeStatusQuery = (status, now = new Date()) => {
  const current = now instanceof Date ? now : new Date(now);

  if (status === MARKETPLACE_STATUS.LIVE) {
    return { startTime: { $lte: current }, endTime: { $gt: current } };
  }
  if (status === MARKETPLACE_STATUS.UPCOMING) {
    return { startTime: { $gt: current } };
  }
  if (status === MARKETPLACE_STATUS.ENDED) {
    return { endTime: { $lte: current } };
  }
  return {};
};

export const getMarketplaceSortQuery = (sort) => {
  if (sort === MARKETPLACE_SORTS.NEWEST) {
    return { createdAt: -1, endTime: 1 };
  }
  if (sort === MARKETPLACE_SORTS.PRICE_HIGH) {
    return { currentBid: -1, endTime: 1 };
  }
  if (sort === MARKETPLACE_SORTS.PRICE_LOW) {
    return { currentBid: 1, endTime: 1 };
  }
  if (sort === MARKETPLACE_SORTS.QUALITY) {
    return { qualityScore: -1, endTime: 1 };
  }
  return { endTime: 1, createdAt: -1 };
};

export const buildMarketplaceQuery = (params = {}, now = new Date()) => {
  const page = parsePositiveInt(params.page, 1, { min: 1, max: 10000 });
  const limit = parsePositiveInt(params.limit, DEFAULT_LIMIT, {
    min: 1,
    max: MAX_LIMIT,
  });
  const q = cleanText(params.q || params.search, 120);
  const status = cleanChoice(
    params.status,
    Object.values(MARKETPLACE_STATUS),
    MARKETPLACE_STATUS.ALL
  );
  const category = cleanChoice(params.category, AUCTION_CATEGORIES, "");
  const condition = cleanChoice(params.condition, AUCTION_CONDITIONS, "");
  const sort = cleanChoice(
    params.sort,
    Object.values(MARKETPLACE_SORTS),
    MARKETPLACE_SORTS.ENDING_SOON
  );
  const minPrice = parseAmount(params.minPrice);
  const maxPrice = parseAmount(params.maxPrice);
  const priceMin = minPrice !== null && maxPrice !== null
    ? Math.min(minPrice, maxPrice)
    : minPrice;
  const priceMax = minPrice !== null && maxPrice !== null
    ? Math.max(minPrice, maxPrice)
    : maxPrice;

  const baseQuery = { status: { $ne: "Draft" } };
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    baseQuery.$or = [
      { title: regex },
      { description: regex },
      { category: regex },
      { condition: regex },
    ];
  }
  if (category) baseQuery.category = category;
  if (condition) baseQuery.condition = condition;
  if (priceMin !== null || priceMax !== null) {
    baseQuery.currentBid = {};
    if (priceMin !== null) baseQuery.currentBid.$gte = priceMin;
    if (priceMax !== null) baseQuery.currentBid.$lte = priceMax;
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    filters: {
      q,
      status,
      category,
      condition,
      minPrice: priceMin,
      maxPrice: priceMax,
      sort,
    },
    baseQuery,
    mongoQuery: {
      ...baseQuery,
      ...getRuntimeStatusQuery(status, now),
    },
    sortQuery: getMarketplaceSortQuery(sort),
  };
};

export const buildMarketplacePagination = ({ page, limit, totalItems }) => {
  const safeTotal = Number.isFinite(Number(totalItems)) ? Number(totalItems) : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));

  return {
    page,
    limit,
    totalItems: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
