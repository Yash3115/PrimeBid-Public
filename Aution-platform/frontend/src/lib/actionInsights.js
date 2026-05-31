import {
  FULFILLMENT_STATUS,
  SETTLEMENT_STATUS,
  getFulfillmentLabel,
  hasActiveEscrow,
} from "./fulfillment.js";

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getWonAuctionPath = (auction = {}) =>
  auction._id ? `/won-auctions#won-auction-${auction._id}` : "/won-auctions";

export const getWinnerNextAction = (auction = {}) => {
  const fulfillment = auction.fulfillment;
  const status = fulfillment?.status || FULFILLMENT_STATUS.AWAITING_ADDRESS;
  const hasAddress = Boolean(fulfillment?.deliveryAddress?.addressLine1);
  const to = getWonAuctionPath(auction);

  if (status === FULFILLMENT_STATUS.ISSUE_REPORTED) {
    return {
      id: `issue-${auction._id}`,
      label: "Issue reported",
      detail: "Review the shipment notes and contact support if needed.",
      actionLabel: "Review issue",
      to,
      priority: "critical",
    };
  }

  if (status === FULFILLMENT_STATUS.DELIVERED && hasActiveEscrow(fulfillment)) {
    return {
      id: `confirm-${auction._id}`,
      label: "Confirm delivery",
      detail: "Confirm receipt to release escrow to the seller.",
      actionLabel: "Confirm received",
      to,
      priority: "critical",
    };
  }

  if (!hasAddress && status === FULFILLMENT_STATUS.AWAITING_ADDRESS) {
    return {
      id: `address-${auction._id}`,
      label: "Add delivery address",
      detail: `${auction.title || "Won auction"} is waiting for your shipping details.`,
      actionLabel: "Add address",
      to,
      priority: "critical",
    };
  }

  if (status === FULFILLMENT_STATUS.READY_TO_SHIP) {
    return {
      id: `ready-${auction._id}`,
      label: "Seller preparing shipment",
      detail: "Your address is saved. The seller needs to ship next.",
      actionLabel: "View handoff",
      to,
      priority: "medium",
    };
  }

  if (
    [FULFILLMENT_STATUS.SHIPPED, FULFILLMENT_STATUS.OUT_FOR_DELIVERY].includes(
      status
    )
  ) {
    return {
      id: `tracking-${auction._id}`,
      label: getFulfillmentLabel(status),
      detail: "Tracking updates are available for this won auction.",
      actionLabel: "Track order",
      to,
      priority: "medium",
    };
  }

  if (status === FULFILLMENT_STATUS.DELIVERED) {
    return {
      id: `review-${auction._id}`,
      label:
        fulfillment?.settlementStatus === SETTLEMENT_STATUS.REFUNDED_TO_BUYER
          ? "Refund completed"
          : "Leave seller feedback",
      detail:
        fulfillment?.settlementStatus === SETTLEMENT_STATUS.REFUNDED_TO_BUYER
          ? "The disputed escrow was returned to your wallet."
          : "Close the loop by rating your seller experience.",
      actionLabel: "Review seller",
      to,
      priority: "low",
    };
  }

  return {
    id: `handoff-${auction._id}`,
    label: getFulfillmentLabel(status),
    detail: "Check the winner handoff for the latest status.",
    actionLabel: "View win",
    to,
    priority: "low",
  };
};

export const buildBidderNextActions = ({
  availableBalance = 0,
  bidLocks = [],
  outbidAuctions = [],
  pendingWithdrawals = [],
  wonAuctions = [],
} = {}) => {
  const winnerActions = wonAuctions.map(getWinnerNextAction);
  const criticalWinnerActions = winnerActions.filter(
    (item) => item.priority === "critical"
  );
  const actions = [];

  if (criticalWinnerActions.length > 0) {
    actions.push({
      id: "winner-actions",
      label: "Won auctions need action",
      count: criticalWinnerActions.length,
      detail: criticalWinnerActions[0].detail,
      actionLabel: criticalWinnerActions[0].actionLabel,
      to: criticalWinnerActions[0].to,
      priority: "critical",
    });
  }

  if (outbidAuctions.length > 0) {
    actions.push({
      id: "outbid",
      label: "You have been outbid",
      count: outbidAuctions.length,
      detail: "Increase your bid before these auctions close.",
      actionLabel: "Bid again",
      to: `/auction/item/${outbidAuctions[0]._id}`,
      priority: "high",
    });
  }

  if (toNumber(availableBalance) <= 0 && bidLocks.length === 0) {
    actions.push({
      id: "top-up",
      label: "Wallet needs funds",
      count: 1,
      detail: "Add money before joining live auctions.",
      actionLabel: "Deposit",
      to: "/wallet#deposit",
      priority: "high",
    });
  }

  if (pendingWithdrawals.length > 0) {
    actions.push({
      id: "withdrawal-review",
      label: "Withdrawal in review",
      count: pendingWithdrawals.length,
      detail: "Your payout request is reserved while admin reviews it.",
      actionLabel: "Open wallet",
      to: "/wallet",
      priority: "medium",
    });
  }

  if (actions.length === 0 && bidLocks.length > 0) {
    actions.push({
      id: "leading-bids",
      label: "You are leading",
      count: bidLocks.length,
      detail: "Keep an eye on auctions where your wallet funds are locked.",
      actionLabel: "Review holds",
      to: "/wallet",
      priority: "low",
    });
  }

  return actions;
};

export const buildSellerNextActions = ({
  availableBalance = 0,
  fulfillmentQueue = [],
  healthQueue = [],
  noBidAuctions = [],
  sellerQuality = null,
} = {}) => {
  const statusCount = (status) =>
    fulfillmentQueue.filter((fulfillment) => fulfillment.status === status).length;
  const issueCount = statusCount(FULFILLMENT_STATUS.ISSUE_REPORTED);
  const readyToShipCount = statusCount(FULFILLMENT_STATUS.READY_TO_SHIP);
  const awaitingAddressCount = statusCount(FULFILLMENT_STATUS.AWAITING_ADDRESS);
  const awaitingEscrowReleaseCount = fulfillmentQueue.filter(
    (fulfillment) =>
      fulfillment.status === FULFILLMENT_STATUS.DELIVERED &&
      hasActiveEscrow(fulfillment)
  ).length;
  const actions = [];

  if (sellerQuality?.riskLevel === "High") {
    actions.push({
      id: "seller-risk",
      label: "Seller quality risk",
      count: 1,
      detail: sellerQuality.reasons?.[0] || "Admin risk signals need attention.",
      actionLabel: "View health",
      to: "#account-health",
      priority: "critical",
    });
  }

  if (issueCount > 0) {
    actions.push({
      id: "shipment-issues",
      label: "Resolve shipment issues",
      count: issueCount,
      detail: "Some fulfilled orders need seller attention.",
      actionLabel: "Open queue",
      to: "#fulfillment",
      priority: "critical",
    });
  }

  if (readyToShipCount > 0) {
    actions.push({
      id: "ready-to-ship",
      label: "Ship won auctions",
      count: readyToShipCount,
      detail: "Buyers have added addresses and are waiting.",
      actionLabel: "Update shipment",
      to: "#fulfillment",
      priority: "high",
    });
  }

  if (awaitingEscrowReleaseCount > 0) {
    actions.push({
      id: "escrow-release",
      label: "Awaiting escrow release",
      count: awaitingEscrowReleaseCount,
      detail: "Delivered orders are waiting for buyer confirmation or admin review.",
      actionLabel: "View payouts",
      to: "#fulfillment",
      priority: "medium",
    });
  }

  if (awaitingAddressCount > 0) {
    actions.push({
      id: "awaiting-address",
      label: "Waiting for buyer address",
      count: awaitingAddressCount,
      detail: "PrimeBid has notified winners to add delivery details.",
      actionLabel: "View handoffs",
      to: "#fulfillment",
      priority: "medium",
    });
  }

  if (healthQueue.length > 0 || noBidAuctions.length > 0) {
    actions.push({
      id: "listing-health",
      label: "Improve listing health",
      count: Math.max(healthQueue.length, noBidAuctions.length),
      detail: "Refresh weak listings before they close without bids.",
      actionLabel: "Review health",
      to: "#health",
      priority: "medium",
    });
  }

  if (toNumber(availableBalance) > 0) {
    actions.push({
      id: "withdraw",
      label: "Payout available",
      count: 1,
      detail: "Seller proceeds are available in your wallet.",
      actionLabel: "Withdraw",
      to: "/wallet#withdraw",
      priority: "low",
    });
  }

  return actions;
};

export const notificationFilters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "bids", label: "Bids" },
  { id: "fulfillment", label: "Delivery" },
  { id: "wallet", label: "Wallet" },
  { id: "admin", label: "Admin" },
];

export const getNotificationMeta = (notification = {}) => {
  const type = notification.type || "admin";
  const auctionId =
    typeof notification.auction === "object"
      ? notification.auction?._id
      : notification.auction;
  const actionPath =
    notification.actionPath ||
    (auctionId ? `/auction/item/${auctionId}` : "/notifications");

  const byType = {
    outbid: {
      group: "bids",
      label: "Bid alert",
      actionLabel: "Open auction",
      priority: "high",
    },
    ending_soon: {
      group: "bids",
      label: "Ending soon",
      actionLabel: "Open auction",
      priority: "medium",
    },
    auction_won: {
      group: "fulfillment",
      label: "Auction won",
      actionLabel: "Add address",
      priority: "critical",
      actionPath: "/won-auctions",
    },
    auction_ended: {
      group: "bids",
      label: "Auction ended",
      actionLabel: "View result",
      priority: "low",
    },
    auction_extended: {
      group: "bids",
      label: "Extended",
      actionLabel: "Open auction",
      priority: "medium",
    },
    fulfillment: {
      group: "fulfillment",
      label: "Delivery update",
      actionLabel: "View handoff",
      priority: "medium",
    },
    wallet: {
      group: "wallet",
      label: "Wallet",
      actionLabel: "Open wallet",
      priority: "medium",
      actionPath: "/wallet",
    },
    admin: {
      group: "admin",
      label: "Admin",
      actionLabel: "Review",
      priority: "low",
    },
  };

  const meta = byType[type] || byType.admin;
  return {
    ...meta,
    actionPath: notification.actionPath || meta.actionPath || actionPath,
  };
};

export const filterNotifications = (notifications = [], filter = "all") => {
  if (filter === "all") return notifications;
  if (filter === "unread") {
    return notifications.filter((notification) => !notification.read);
  }
  return notifications.filter(
    (notification) => getNotificationMeta(notification).group === filter
  );
};
