import Fulfillment from "../models/fulfillmentSchema.js";
import { applySession, createOne } from "./mongoTransaction.js";

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

export const activeEscrowSettlementStatuses = [
  SETTLEMENT_STATUS.HELD_IN_ESCROW,
  SETTLEMENT_STATUS.READY_TO_RELEASE,
  SETTLEMENT_STATUS.UNDER_DISPUTE,
];

export const sellerManagedStatuses = [
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

export const DISPUTE_FINAL_STATUSES = [
  DISPUTE_STATUS.RESOLVED,
  DISPUTE_STATUS.BUYER_FAVORED,
  DISPUTE_STATUS.SELLER_FAVORED,
];

export const DISPUTE_ISSUE_TYPES = [
  "NotDelivered",
  "DamagedItem",
  "WrongItem",
  "TrackingProblem",
  "SellerUnresponsive",
  "Other",
];

const cleanString = (value, max = 160) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);

const requiredAddressFields = [
  "fullName",
  "phone",
  "addressLine1",
  "city",
  "state",
  "postalCode",
];

export const normalizeDeliveryAddress = (input = {}) => {
  const address = {
    fullName: cleanString(input.fullName, 80),
    phone: cleanString(input.phone, 20),
    addressLine1: cleanString(input.addressLine1, 180),
    addressLine2: cleanString(input.addressLine2, 180),
    city: cleanString(input.city, 80),
    state: cleanString(input.state, 80),
    postalCode: cleanString(input.postalCode, 16).toUpperCase(),
    country: cleanString(input.country || "India", 80),
    instructions: cleanString(input.instructions, 500),
  };

  const missing = requiredAddressFields.filter((field) => !address[field]);
  if (missing.length > 0) {
    const err = new Error(`Delivery address missing: ${missing.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  const phoneDigits = address.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    const err = new Error("Delivery phone number must contain 7 to 15 digits");
    err.statusCode = 400;
    throw err;
  }

  if (address.postalCode.length < 3) {
    const err = new Error("Delivery postal code is too short");
    err.statusCode = 400;
    throw err;
  }

  return address;
};

export const normalizeDisputeReport = (input = {}) => {
  const issueType = cleanString(input.issueType, 60);
  const description = cleanString(input.description, 1000);

  if (!DISPUTE_ISSUE_TYPES.includes(issueType)) {
    const err = new Error("Please choose a valid issue type");
    err.statusCode = 400;
    throw err;
  }

  if (description.length < 10) {
    const err = new Error("Please describe the delivery issue in at least 10 characters");
    err.statusCode = 400;
    throw err;
  }

  return {
    issueType,
    description,
  };
};

export const normalizeDisputeResponse = (input = {}) => {
  const sellerResponse = cleanString(input.sellerResponse, 1000);
  if (sellerResponse.length < 10) {
    const err = new Error("Seller response must be at least 10 characters");
    err.statusCode = 400;
    throw err;
  }
  return { sellerResponse };
};

export const normalizeAdminDisputeReview = (input = {}) => {
  const status = cleanString(input.status, 60);
  const adminResolution = cleanString(input.adminResolution, 1000);
  const settlementAction = cleanString(
    input.settlementAction || SETTLEMENT_ACTION.NONE,
    60
  );

  if (!Object.values(DISPUTE_STATUS).includes(status)) {
    const err = new Error("Please choose a valid dispute review status");
    err.statusCode = 400;
    throw err;
  }

  if (DISPUTE_FINAL_STATUSES.includes(status) && adminResolution.length < 10) {
    const err = new Error("Final dispute decisions require a resolution note");
      err.statusCode = 400;
      throw err;
  }

  if (!Object.values(SETTLEMENT_ACTION).includes(settlementAction)) {
    const err = new Error("Please choose a valid settlement action");
    err.statusCode = 400;
    throw err;
  }

  return {
    status,
    adminResolution,
    settlementAction,
    isFinal: DISPUTE_FINAL_STATUSES.includes(status),
  };
};

export const normalizeAdminSettlementReview = (input = {}) => {
  const settlementAction = cleanString(input.settlementAction, 60);
  const adminResolution = cleanString(
    input.adminResolution || input.note,
    1000
  );

  if (
    ![
      SETTLEMENT_ACTION.RELEASE_TO_SELLER,
      SETTLEMENT_ACTION.REFUND_BUYER,
    ].includes(settlementAction)
  ) {
    const err = new Error("Choose whether to release escrow or refund the buyer");
    err.statusCode = 400;
    throw err;
  }

  if (adminResolution.length < 10) {
    const err = new Error("Escrow settlement decisions require an admin note");
    err.statusCode = 400;
    throw err;
  }

  return {
    settlementAction,
    adminResolution,
  };
};

export const getFulfillmentProgress = (status) => {
  const steps = [
    FULFILLMENT_STATUS.AWAITING_ADDRESS,
    FULFILLMENT_STATUS.READY_TO_SHIP,
    FULFILLMENT_STATUS.SHIPPED,
    FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
    FULFILLMENT_STATUS.DELIVERED,
  ];
  const currentIndex = steps.indexOf(status);
  return {
    steps,
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    isIssue: status === FULFILLMENT_STATUS.ISSUE_REPORTED,
  };
};

export const buildTimelineEntry = ({
  status,
  title,
  message,
  actor,
  actorRole = "System",
}) => ({
  status,
  title,
  message,
  actor,
  actorRole,
  createdAt: new Date(),
});

export const ensureFulfillmentForAuction = async ({
  auction,
  bid,
  bidderId,
  sellerId,
  winningAmount,
  settlementStatus = SETTLEMENT_STATUS.HELD_IN_ESCROW,
  settlement = {},
  session,
}) => {
  const existing = await applySession(
    Fulfillment.findOne({ auction: auction._id }),
    session
  );
  if (existing) {
    return { fulfillment: existing, created: false };
  }

  try {
    const fulfillment = await createOne(Fulfillment, {
      auction: auction._id,
      bidder: bidderId,
      seller: sellerId,
      winningBid: bid?._id,
      winningAmount: Number(winningAmount || bid?.amount || auction.currentBid || 0),
      settlementStatus,
      settlement,
      status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
      timeline: [
        buildTimelineEntry({
          status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
          title: "Delivery address requested",
          message: "The auction has closed. The winner needs to add delivery details before the seller can ship.",
        }),
      ],
    }, session);

    return { fulfillment, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const fulfillment = await applySession(
        Fulfillment.findOne({ auction: auction._id }),
        session
      );
      if (fulfillment) return { fulfillment, created: false };
    }
    throw error;
  }
};
