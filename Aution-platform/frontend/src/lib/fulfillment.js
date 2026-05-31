export const FULFILLMENT_STATUS = {
  AWAITING_ADDRESS: "AwaitingAddress",
  READY_TO_SHIP: "ReadyToShip",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "OutForDelivery",
  DELIVERED: "Delivered",
  ISSUE_REPORTED: "IssueReported",
};

export const SETTLEMENT_STATUS = {
  WALLET_CAPTURED: "WalletCaptured",
  NEEDS_REVIEW: "NeedsReview",
  HELD_IN_ESCROW: "HeldInEscrow",
  READY_TO_RELEASE: "ReadyToRelease",
  RELEASED_TO_SELLER: "ReleasedToSeller",
  REFUNDED_TO_BUYER: "RefundedToBuyer",
  UNDER_DISPUTE: "UnderDispute",
};

export const SETTLEMENT_ACTION = {
  NONE: "None",
  RELEASE_TO_SELLER: "ReleaseToSeller",
  REFUND_BUYER: "RefundBuyer",
};

export const fulfillmentStatusLabels = {
  [FULFILLMENT_STATUS.AWAITING_ADDRESS]: "Awaiting address",
  [FULFILLMENT_STATUS.READY_TO_SHIP]: "Ready to ship",
  [FULFILLMENT_STATUS.SHIPPED]: "Shipped",
  [FULFILLMENT_STATUS.OUT_FOR_DELIVERY]: "Out for delivery",
  [FULFILLMENT_STATUS.DELIVERED]: "Delivered",
  [FULFILLMENT_STATUS.ISSUE_REPORTED]: "Issue reported",
};

export const fulfillmentStatusTone = {
  [FULFILLMENT_STATUS.AWAITING_ADDRESS]: "bg-amber-50 text-amber-700",
  [FULFILLMENT_STATUS.READY_TO_SHIP]: "bg-indigo-50 text-indigo-700",
  [FULFILLMENT_STATUS.SHIPPED]: "bg-blue-50 text-blue-700",
  [FULFILLMENT_STATUS.OUT_FOR_DELIVERY]: "bg-violet-50 text-violet-700",
  [FULFILLMENT_STATUS.DELIVERED]: "bg-emerald-50 text-emerald-700",
  [FULFILLMENT_STATUS.ISSUE_REPORTED]: "bg-red-50 text-red-700",
};

export const sellerShipmentStatusOptions = [
  FULFILLMENT_STATUS.SHIPPED,
  FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
  FULFILLMENT_STATUS.DELIVERED,
  FULFILLMENT_STATUS.ISSUE_REPORTED,
];

export const DISPUTE_STATUS = {
  OPEN: "Open",
  SELLER_RESPONDED: "SellerResponded",
  NEEDS_MORE_INFO: "NeedsMoreInfo",
  RESOLVED: "Resolved",
  BUYER_FAVORED: "BuyerFavored",
  SELLER_FAVORED: "SellerFavored",
};

export const disputeStatusLabels = {
  [DISPUTE_STATUS.OPEN]: "Open",
  [DISPUTE_STATUS.SELLER_RESPONDED]: "Seller responded",
  [DISPUTE_STATUS.NEEDS_MORE_INFO]: "Needs more info",
  [DISPUTE_STATUS.RESOLVED]: "Resolved",
  [DISPUTE_STATUS.BUYER_FAVORED]: "Buyer favored",
  [DISPUTE_STATUS.SELLER_FAVORED]: "Seller favored",
};

export const disputeStatusTone = {
  [DISPUTE_STATUS.OPEN]: "bg-red-50 text-red-700",
  [DISPUTE_STATUS.SELLER_RESPONDED]: "bg-amber-50 text-amber-700",
  [DISPUTE_STATUS.NEEDS_MORE_INFO]: "bg-violet-50 text-violet-700",
  [DISPUTE_STATUS.RESOLVED]: "bg-emerald-50 text-emerald-700",
  [DISPUTE_STATUS.BUYER_FAVORED]: "bg-blue-50 text-blue-700",
  [DISPUTE_STATUS.SELLER_FAVORED]: "bg-slate-100 text-slate-700",
};

export const disputeIssueTypeOptions = [
  { value: "NotDelivered", label: "Item not delivered" },
  { value: "DamagedItem", label: "Item arrived damaged" },
  { value: "WrongItem", label: "Wrong item received" },
  { value: "TrackingProblem", label: "Tracking issue" },
  { value: "SellerUnresponsive", label: "Seller unresponsive" },
  { value: "Other", label: "Other issue" },
];

export const settlementStatusLabels = {
  [SETTLEMENT_STATUS.WALLET_CAPTURED]: "Legacy captured",
  [SETTLEMENT_STATUS.NEEDS_REVIEW]: "Needs review",
  [SETTLEMENT_STATUS.HELD_IN_ESCROW]: "Held in escrow",
  [SETTLEMENT_STATUS.READY_TO_RELEASE]: "Ready to release",
  [SETTLEMENT_STATUS.RELEASED_TO_SELLER]: "Released to seller",
  [SETTLEMENT_STATUS.REFUNDED_TO_BUYER]: "Refunded to buyer",
  [SETTLEMENT_STATUS.UNDER_DISPUTE]: "Blocked by dispute",
};

export const settlementStatusTone = {
  [SETTLEMENT_STATUS.WALLET_CAPTURED]: "bg-slate-100 text-slate-700",
  [SETTLEMENT_STATUS.NEEDS_REVIEW]: "bg-amber-50 text-amber-700",
  [SETTLEMENT_STATUS.HELD_IN_ESCROW]: "bg-indigo-50 text-indigo-700",
  [SETTLEMENT_STATUS.READY_TO_RELEASE]: "bg-blue-50 text-blue-700",
  [SETTLEMENT_STATUS.RELEASED_TO_SELLER]: "bg-emerald-50 text-emerald-700",
  [SETTLEMENT_STATUS.REFUNDED_TO_BUYER]: "bg-slate-100 text-slate-700",
  [SETTLEMENT_STATUS.UNDER_DISPUTE]: "bg-red-50 text-red-700",
};

export const settlementActionOptions = [
  { value: SETTLEMENT_ACTION.RELEASE_TO_SELLER, label: "Release to seller" },
  { value: SETTLEMENT_ACTION.REFUND_BUYER, label: "Refund buyer" },
  { value: SETTLEMENT_ACTION.NONE, label: "No money action yet" },
];

export const activeEscrowSettlementStatuses = [
  SETTLEMENT_STATUS.HELD_IN_ESCROW,
  SETTLEMENT_STATUS.READY_TO_RELEASE,
  SETTLEMENT_STATUS.UNDER_DISPUTE,
];

export const getFulfillmentLabel = (status) =>
  fulfillmentStatusLabels[status] || "Awaiting address";

export const getFulfillmentTone = (status) =>
  fulfillmentStatusTone[status] ||
  fulfillmentStatusTone[FULFILLMENT_STATUS.AWAITING_ADDRESS];

export const canEditDeliveryAddress = (status) =>
  ![
    FULFILLMENT_STATUS.SHIPPED,
    FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
    FULFILLMENT_STATUS.DELIVERED,
  ].includes(status);

export const getAuctionIdFromFulfillment = (fulfillment) => {
  const auction = fulfillment?.auction;
  return typeof auction === "object" ? auction?._id : auction;
};

export const getDisputeLabel = (status) =>
  disputeStatusLabels[status] || "No dispute";

export const getDisputeTone = (status) =>
  disputeStatusTone[status] || "bg-slate-100 text-slate-700";

export const getIssueTypeLabel = (issueType) =>
  disputeIssueTypeOptions.find((option) => option.value === issueType)?.label ||
  "Delivery issue";

export const hasOpenDispute = (fulfillment) =>
  Boolean(fulfillment?.dispute?.isOpen);

export const getSettlementLabel = (status) =>
  settlementStatusLabels[status] || "Settlement unavailable";

export const getSettlementTone = (status) =>
  settlementStatusTone[status] || "bg-slate-100 text-slate-700";

export const hasActiveEscrow = (fulfillment) =>
  activeEscrowSettlementStatuses.includes(fulfillment?.settlementStatus);

export const canConfirmDelivery = (fulfillment) =>
  fulfillment?.status === FULFILLMENT_STATUS.DELIVERED &&
  hasActiveEscrow(fulfillment) &&
  !hasOpenDispute(fulfillment);
