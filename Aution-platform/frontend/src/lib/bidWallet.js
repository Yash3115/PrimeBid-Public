const getComparableId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return String(value);
};

export const idsMatch = (left, right) => {
  const leftId = getComparableId(left);
  const rightId = getComparableId(right);
  return Boolean(leftId && rightId && leftId === rightId);
};

export const getBidderAuctionBidEntry = (bidders = [], userId) => {
  if (!Array.isArray(bidders) || !userId) return null;

  return (
    bidders.find((bid) => idsMatch(bid.userId || bid.bidder?.id, userId)) ||
    null
  );
};

export const getBidderAuctionLock = (bidders = [], userId) => {
  const bidEntry = getBidderAuctionBidEntry(bidders, userId);
  const lockedAmount = Number(bidEntry?.lockedAmount || 0);

  return Number.isFinite(lockedAmount) && lockedAmount > 0 ? lockedAmount : 0;
};

export const getBidWalletRequirement = ({
  walletAvailable = 0,
  bidAmount = 0,
  currentAuctionLock = 0,
}) => {
  const available = Math.max(Number(walletAvailable || 0), 0);
  const target = Number(bidAmount);
  const existingLock = Math.max(Number(currentAuctionLock || 0), 0);
  const targetLock = Number.isFinite(target) && target > 0 ? target : 0;
  const additionalLock = Math.max(targetLock - existingLock, 0);
  const shortfall = Math.max(additionalLock - available, 0);

  return {
    available,
    currentAuctionLock: existingLock,
    targetLock,
    additionalLock,
    shortfall,
    canCover: shortfall <= 0,
    biddingPower: available + existingLock,
  };
};
