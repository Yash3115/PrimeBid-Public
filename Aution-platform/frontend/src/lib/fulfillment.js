export const FULFILLMENT_STATUS = {
  AWAITING_ADDRESS: "AwaitingAddress",
  READY_TO_SHIP: "ReadyToShip",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "OutForDelivery",
  DELIVERED: "Delivered",
  ISSUE_REPORTED: "IssueReported",
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
