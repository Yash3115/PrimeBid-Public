export const MARKETPLACE_DEFAULTS = {
  q: "",
  status: "All",
  category: "All",
  condition: "All",
  sort: "endingSoon",
  minPrice: "",
  maxPrice: "",
  page: 1,
  limit: 12,
};

export const MARKETPLACE_STATUS_OPTIONS = ["All", "Live", "Upcoming", "Ended"];

export const MARKETPLACE_SORT_OPTIONS = [
  ["endingSoon", "Ending soon"],
  ["newest", "Newest"],
  ["priceHigh", "Highest bid"],
  ["priceLow", "Lowest bid"],
  ["quality", "Best listing quality"],
];

const positiveInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const nonNegativeNumberText = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  return String(value);
};

export const marketplaceQueryFromSearchParams = (searchParams) => {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams || "");
  const status = params.get("status") || MARKETPLACE_DEFAULTS.status;
  const sort = params.get("sort") || MARKETPLACE_DEFAULTS.sort;

  return {
    q: (params.get("q") || "").trim(),
    status: MARKETPLACE_STATUS_OPTIONS.includes(status)
      ? status
      : MARKETPLACE_DEFAULTS.status,
    category: params.get("category") || MARKETPLACE_DEFAULTS.category,
    condition: params.get("condition") || MARKETPLACE_DEFAULTS.condition,
    sort: MARKETPLACE_SORT_OPTIONS.some(([value]) => value === sort)
      ? sort
      : MARKETPLACE_DEFAULTS.sort,
    minPrice: nonNegativeNumberText(params.get("minPrice")),
    maxPrice: nonNegativeNumberText(params.get("maxPrice")),
    page: positiveInt(params.get("page"), MARKETPLACE_DEFAULTS.page),
    limit: positiveInt(params.get("limit"), MARKETPLACE_DEFAULTS.limit),
  };
};

export const marketplaceQueryToApiParams = (query = {}) => {
  const normalized = { ...MARKETPLACE_DEFAULTS, ...query };
  const params = {
    page: normalized.page,
    limit: normalized.limit,
    sort: normalized.sort,
  };

  if (normalized.q) params.q = normalized.q;
  if (normalized.status !== "All") params.status = normalized.status;
  if (normalized.category !== "All") params.category = normalized.category;
  if (normalized.condition !== "All") params.condition = normalized.condition;
  if (normalized.minPrice !== "") params.minPrice = normalized.minPrice;
  if (normalized.maxPrice !== "") params.maxPrice = normalized.maxPrice;

  return params;
};

export const setMarketplaceSearchParam = (
  currentParams,
  key,
  value,
  { resetPage = true } = {}
) => {
  const next = new URLSearchParams(currentParams);
  const defaultValue = MARKETPLACE_DEFAULTS[key];
  const shouldDelete =
    value === undefined ||
    value === null ||
    value === "" ||
    value === defaultValue ||
    (["status", "category", "condition"].includes(key) && value === "All");

  if (shouldDelete) {
    next.delete(key);
  } else {
    next.set(key, String(value));
  }

  if (resetPage && key !== "page") {
    next.delete("page");
  }

  return next;
};

export const clearMarketplaceSearchParams = () => new URLSearchParams();
