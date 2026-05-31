export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export const formatDateTime = (date) => {
  if (!date) return "Not set";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

export const formatCompactDateTime = (date) => {
  if (!date) return "Not set";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

export const formatSellerRating = (reputationOrAverage, ratingCount) => {
  const reputation =
    reputationOrAverage && typeof reputationOrAverage === "object"
      ? reputationOrAverage
      : null;
  const average = Number(reputation?.ratingAverage ?? reputationOrAverage);
  const countValue = reputation?.ratingCount ?? ratingCount;
  const hasCount = countValue !== undefined && countValue !== null;
  const count = Number(countValue);

  if (hasCount && (!Number.isFinite(count) || count <= 0)) {
    return "No rating yet";
  }

  if (!Number.isFinite(average) || average <= 0) {
    return "No rating yet";
  }

  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(average)}/5`;
};

export const formatReviewCount = (countValue) => {
  const count = Number(countValue || 0);
  if (!Number.isFinite(count) || count <= 0) return "No reviews yet";
  return `${count} ${count === 1 ? "review" : "reviews"}`;
};

export const normalizeAuctionStatus = (status) => {
  if (status === "Not started") return "Upcoming";
  if (["Upcoming", "Live", "Ended", "Invalid"].includes(status)) return status;
  return null;
};

const toTimeMs = (value) => {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const getServerNowMs = (serverTime, serverTimeReceivedAt) => {
  const serverTimeMs = toTimeMs(serverTime);
  if (serverTimeMs === null) return Date.now();

  const receivedAtMs = Number(serverTimeReceivedAt);
  if (!Number.isFinite(receivedAtMs)) return serverTimeMs;

  return serverTimeMs + Math.max(Date.now() - receivedAtMs, 0);
};

export const getAuctionStatus = (
  auctionOrStartTime,
  endTime,
  serverTime,
  serverTimeReceivedAt
) => {
  const auction =
    auctionOrStartTime && typeof auctionOrStartTime === "object"
      ? auctionOrStartTime
      : null;
  const startsAt = toTimeMs(auction?.startsAt || auction?.startTime || auctionOrStartTime);
  const endsAt = toTimeMs(auction?.endsAt || auction?.endTime || endTime);

  if (startsAt === null || endsAt === null || endsAt <= startsAt) {
    return normalizeAuctionStatus(auction?.runtimeStatus) || "Invalid";
  }

  const now = getServerNowMs(serverTime || auction?.serverTime, serverTimeReceivedAt);
  if (now < startsAt) return "Upcoming";
  if (now >= endsAt) return "Ended";
  return "Live";
};

export const getAuctionCountdown = (
  auctionOrStartTime,
  endTime,
  serverTime,
  serverTimeReceivedAt
) => {
  const auction =
    auctionOrStartTime && typeof auctionOrStartTime === "object"
      ? auctionOrStartTime
      : null;
  const startsAt = toTimeMs(auction?.startsAt || auction?.startTime || auctionOrStartTime);
  const endsAt = toTimeMs(auction?.endsAt || auction?.endTime || endTime);

  if (startsAt === null || endsAt === null || endsAt <= startsAt) return {};

  const now = getServerNowMs(serverTime || auction?.serverTime, serverTimeReceivedAt);
  const difference = now < startsAt ? startsAt - now : endsAt - now;
  if (difference <= 0) return {};

  return {
    type: now < startsAt ? "Starts In" : "Ends In",
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};
