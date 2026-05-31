import {
  FULFILLMENT_STATUS,
  hasActiveEscrow,
  hasOpenDispute,
} from "./fulfillment.js";

export const IMAGE_FALLBACK_SRC = "/imageHolder.jpg";

export const getAuctionImageSrc = (imageOrUrl) => {
  const url =
    typeof imageOrUrl === "string" ? imageOrUrl : imageOrUrl?.url || "";
  const trimmedUrl = typeof url === "string" ? url.trim() : "";

  return trimmedUrl || IMAGE_FALLBACK_SRC;
};

const actionableBidStatuses = new Set(["Live"]);

export const isActionableBidLock = (lock = {}) =>
  Number(lock.amount || 0) > 0 && actionableBidStatuses.has(lock.runtimeStatus);

export const filterActionableBidLocks = (bidLocks = []) =>
  bidLocks.filter(isActionableBidLock);

const fulfillmentPriority = {
  issue: 0,
  ready: 1,
  awaitingAddress: 2,
  shipped: 3,
  outForDelivery: 4,
  awaitingSettlement: 5,
  delivered: 6,
  other: 7,
};

export const getSellerFulfillmentPriority = (fulfillment = {}) => {
  if (
    fulfillment.status === FULFILLMENT_STATUS.ISSUE_REPORTED ||
    hasOpenDispute(fulfillment)
  ) {
    return fulfillmentPriority.issue;
  }

  if (fulfillment.status === FULFILLMENT_STATUS.READY_TO_SHIP) {
    return fulfillmentPriority.ready;
  }

  if (fulfillment.status === FULFILLMENT_STATUS.AWAITING_ADDRESS) {
    return fulfillmentPriority.awaitingAddress;
  }

  if (fulfillment.status === FULFILLMENT_STATUS.SHIPPED) {
    return fulfillmentPriority.shipped;
  }

  if (fulfillment.status === FULFILLMENT_STATUS.OUT_FOR_DELIVERY) {
    return fulfillmentPriority.outForDelivery;
  }

  if (
    fulfillment.status === FULFILLMENT_STATUS.DELIVERED &&
    hasActiveEscrow(fulfillment)
  ) {
    return fulfillmentPriority.awaitingSettlement;
  }

  if (fulfillment.status === FULFILLMENT_STATUS.DELIVERED) {
    return fulfillmentPriority.delivered;
  }

  return fulfillmentPriority.other;
};

export const sortSellerFulfillmentQueue = (fulfillmentQueue = []) =>
  [...fulfillmentQueue].sort((left, right) => {
    const priorityDifference =
      getSellerFulfillmentPriority(left) - getSellerFulfillmentPriority(right);
    if (priorityDifference !== 0) return priorityDifference;

    return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
  });
