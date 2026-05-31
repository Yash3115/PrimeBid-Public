import mongoose from "mongoose";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Auction from "../models/auctionSchema.js";
import AuditLog from "../models/auditLogSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import User from "../models/userSchema.js";
import { createNotification } from "../utils/notifications.js";
import {
  DISPUTE_STATUS,
  FULFILLMENT_STATUS,
  SETTLEMENT_ACTION,
  SETTLEMENT_STATUS,
  activeEscrowSettlementStatuses,
  buildTimelineEntry,
  normalizeAdminDisputeReview,
  normalizeAdminSettlementReview,
  normalizeDeliveryAddress,
  normalizeDisputeReport,
  normalizeDisputeResponse,
  sellerManagedStatuses,
} from "../utils/fulfillment.js";
import {
  isActiveEscrowSettlement,
  refundEscrowToBuyer,
  releaseEscrowToSeller,
} from "../utils/escrowSettlement.js";
import { runWithOptionalTransaction } from "../utils/mongoTransaction.js";

const fulfillmentPopulate = [
  { path: "auction", select: "title image currentBid endTime" },
  { path: "bidder", select: "userName email phone profileImage" },
  { path: "seller", select: "userName email phone reputation" },
  { path: "dispute.reportedBy", select: "userName email role" },
  { path: "dispute.adminReviewedBy", select: "userName email role" },
  { path: "settlement.reviewedBy", select: "userName email role" },
];

const assertObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${label} format`);
    err.statusCode = 400;
    throw err;
  }
};

const findWinnerFulfillment = async (auctionId, userId) => {
  let fulfillment = await Fulfillment.findOne({
    auction: auctionId,
    bidder: userId,
  }).populate(fulfillmentPopulate);

  if (fulfillment) return fulfillment;

  const auction = await Auction.findOne({
    _id: auctionId,
    highestBidder: userId,
    status: { $ne: "Draft" },
  });
  if (!auction) return null;

  fulfillment = await Fulfillment.create({
    auction: auction._id,
    bidder: userId,
    seller: auction.createdBy,
    winningAmount: Number(auction.currentBid || 0),
    settlementStatus: SETTLEMENT_STATUS.NEEDS_REVIEW,
    status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
    timeline: [
      buildTimelineEntry({
        status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
        title: "Delivery address requested",
        message: "The winner needs to add delivery details before the seller can ship.",
      }),
    ],
  });

  return fulfillment.populate(fulfillmentPopulate);
};

const notifySuperAdmins = async ({ auction, title, message, actionPath }) => {
  const admins = await User.find({ role: "Super Admin", accountStatus: "Active" })
    .select("_id")
    .lean();

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        user: admin._id,
        auction,
        type: "admin",
        title,
        message,
        actionPath,
      })
    )
  );
};

const populateFulfillment = (id) => Fulfillment.findById(id).populate(fulfillmentPopulate);

export const submitDeliveryAddress = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "auction ID");

  const fulfillment = await findWinnerFulfillment(id, req.user._id);
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found for this won auction");
    err.statusCode = 404;
    return next(err);
  }

  if (
    [
      FULFILLMENT_STATUS.SHIPPED,
      FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
      FULFILLMENT_STATUS.DELIVERED,
    ].includes(fulfillment.status)
  ) {
    const err = new Error("Delivery address cannot be changed after shipment starts");
    err.statusCode = 400;
    return next(err);
  }

  const deliveryAddress = normalizeDeliveryAddress(req.body);
  fulfillment.deliveryAddress = deliveryAddress;
  fulfillment.addressSubmittedAt = new Date();
  fulfillment.status = FULFILLMENT_STATUS.READY_TO_SHIP;
  fulfillment.timeline.push(
    buildTimelineEntry({
      status: FULFILLMENT_STATUS.READY_TO_SHIP,
      title: "Delivery address submitted",
      message: "The winner added delivery details. The seller can now prepare shipment.",
      actor: req.user._id,
      actorRole: "Bidder",
    })
  );
  await fulfillment.save();

  await createNotification({
    user: fulfillment.seller?._id || fulfillment.seller,
    auction: fulfillment.auction?._id || fulfillment.auction,
    type: "fulfillment",
    title: "Delivery address added",
    message: `${req.user.userName} added delivery details. You can prepare and ship the item now.`,
    actionPath: "/seller-dashboard",
  });

  const populated = await Fulfillment.findById(fulfillment._id).populate(
    fulfillmentPopulate
  );

  return res.status(200).json({
    success: true,
    message: "Delivery address saved",
    fulfillment: populated,
  });
});

export const updateShipmentStatus = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "auction ID");

  const { status, carrier, trackingNumber, trackingUrl, estimatedDeliveryDate, sellerNote } =
    req.body;

  if (!sellerManagedStatuses.includes(status)) {
    const err = new Error("Invalid shipment status");
    err.statusCode = 400;
    return next(err);
  }

  const fulfillment = await Fulfillment.findOne({
    auction: id,
    seller: req.user._id,
  });
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found for this auction");
    err.statusCode = 404;
    return next(err);
  }

  if (!fulfillment.deliveryAddress?.addressLine1 && status !== FULFILLMENT_STATUS.ISSUE_REPORTED) {
    const err = new Error("Buyer delivery address is required before shipment updates");
    err.statusCode = 400;
    return next(err);
  }

  fulfillment.shipping = fulfillment.shipping || {};
  const cleanCarrier = String(carrier || "").trim();
  const cleanTrackingNumber = String(trackingNumber || "").trim();

  if (
    [FULFILLMENT_STATUS.SHIPPED, FULFILLMENT_STATUS.OUT_FOR_DELIVERY].includes(
      status
    )
  ) {
    if (!cleanCarrier || !cleanTrackingNumber) {
      const err = new Error("Carrier and tracking number are required when marking shipped");
      err.statusCode = 400;
      return next(err);
    }
  }

  if (cleanCarrier) {
    fulfillment.shipping.carrier = cleanCarrier.slice(0, 80);
  }
  if (cleanTrackingNumber) {
    fulfillment.shipping.trackingNumber = cleanTrackingNumber.slice(0, 120);
  }
  if (trackingUrl) {
    fulfillment.shipping.trackingUrl = String(trackingUrl || "").trim().slice(0, 300);
  }
  if (status === FULFILLMENT_STATUS.SHIPPED) {
    fulfillment.shipping.shippedAt = fulfillment.shipping.shippedAt || new Date();
  }

  if (estimatedDeliveryDate) {
    const parsedDate = new Date(estimatedDeliveryDate);
    if (Number.isNaN(parsedDate.getTime())) {
      const err = new Error("Estimated delivery date is invalid");
      err.statusCode = 400;
      return next(err);
    }
    fulfillment.shipping.estimatedDeliveryDate = parsedDate;
  }

  fulfillment.status = status;
  fulfillment.shipping.sellerNote = String(sellerNote || "").trim().slice(0, 500);
  if (status === FULFILLMENT_STATUS.DELIVERED) {
    fulfillment.shipping.deliveredAt = new Date();
    if (
      isActiveEscrowSettlement(fulfillment.settlementStatus) &&
      !fulfillment.dispute?.isOpen
    ) {
      fulfillment.settlementStatus = SETTLEMENT_STATUS.READY_TO_RELEASE;
    }
  }

  const timelineCopy = {
    [FULFILLMENT_STATUS.SHIPPED]: {
      title: "Item shipped",
      message: `The seller shipped the item${fulfillment.shipping.carrier ? ` with ${fulfillment.shipping.carrier}` : ""}.`,
    },
    [FULFILLMENT_STATUS.OUT_FOR_DELIVERY]: {
      title: "Out for delivery",
      message: "The seller marked the shipment as out for delivery.",
    },
    [FULFILLMENT_STATUS.DELIVERED]: {
      title: "Delivered",
      message: "The seller marked the order as delivered. Confirm receipt to release escrow.",
    },
    [FULFILLMENT_STATUS.ISSUE_REPORTED]: {
      title: "Issue reported",
      message: fulfillment.shipping.sellerNote || "The seller reported an issue with fulfillment.",
    },
  }[status];

  fulfillment.timeline.push(
    buildTimelineEntry({
      status,
      title: timelineCopy.title,
      message: timelineCopy.message,
      actor: req.user._id,
      actorRole: "Auctioneer",
    })
  );
  await fulfillment.save();

  await createNotification({
    user: fulfillment.bidder,
    auction: fulfillment.auction,
    type: "fulfillment",
    title: timelineCopy.title,
    message: timelineCopy.message,
    actionPath: "/won-auctions",
  });

  const populated = await Fulfillment.findById(fulfillment._id).populate(
    fulfillmentPopulate
  );

  return res.status(200).json({
    success: true,
    message: "Shipment status updated",
    fulfillment: populated,
  });
});

export const confirmFulfillmentDelivery = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "auction ID");

  const fulfillment = await findWinnerFulfillment(id, req.user._id);
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found for this won auction");
    err.statusCode = 404;
    return next(err);
  }

  if (fulfillment.dispute?.isOpen) {
    const err = new Error("Resolve the open delivery issue before confirming receipt");
    err.statusCode = 409;
    return next(err);
  }

  if (fulfillment.status !== FULFILLMENT_STATUS.DELIVERED) {
    const err = new Error("The seller must mark the item delivered before escrow can be released");
    err.statusCode = 400;
    return next(err);
  }

  if (
    fulfillment.settlementStatus === SETTLEMENT_STATUS.RELEASED_TO_SELLER &&
    fulfillment.settlement?.deliveryConfirmedAt
  ) {
    const populated = await populateFulfillment(fulfillment._id);
    return res.status(200).json({
      success: true,
      message: "Delivery was already confirmed",
      fulfillment: populated,
    });
  }

  fulfillment.settlement = {
    ...(fulfillment.settlement?.toObject?.() || fulfillment.settlement || {}),
    deliveryConfirmedAt: new Date(),
  };

  let message = "Delivery confirmed";
  let escrowReleased = false;
  if (isActiveEscrowSettlement(fulfillment.settlementStatus)) {
    await runWithOptionalTransaction(async ({ session }) => {
      await releaseEscrowToSeller({
        fulfillment,
        actor: req.user._id,
        actorRole: "Bidder",
        note: "Buyer confirmed delivery and released escrow to the seller",
        session,
      });
    });
    message = "Delivery confirmed and escrow released";
    escrowReleased = true;
  } else {
    fulfillment.timeline.push(
      buildTimelineEntry({
        status: FULFILLMENT_STATUS.DELIVERED,
        title: "Delivery confirmed",
        message: "The buyer confirmed delivery.",
        actor: req.user._id,
        actorRole: "Bidder",
      })
    );
    await runWithOptionalTransaction(async ({ session }) => {
      await fulfillment.save({ session });
    });
  }

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  await createNotification({
    user: fulfillment.seller?._id || fulfillment.seller,
    auction: auctionId,
    type: escrowReleased ? "wallet" : "fulfillment",
    title: escrowReleased ? "Escrow released" : "Delivery confirmed",
    message: escrowReleased
      ? `${req.user.userName} confirmed delivery. Seller proceeds are now available for withdrawal.`
      : `${req.user.userName} confirmed delivery.`,
    actionPath: escrowReleased ? "/wallet" : "/seller-dashboard#fulfillment",
  });

  const populated = await populateFulfillment(fulfillment._id);

  return res.status(200).json({
    success: true,
    message,
    fulfillment: populated,
  });
});

export const reportFulfillmentIssue = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "auction ID");

  const fulfillment = await findWinnerFulfillment(id, req.user._id);
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found for this won auction");
    err.statusCode = 404;
    return next(err);
  }

  if (fulfillment.dispute?.isOpen) {
    const err = new Error("A delivery issue is already open for this auction");
    err.statusCode = 409;
    return next(err);
  }

  const report = normalizeDisputeReport(req.body);
  const previousStatus =
    fulfillment.status === FULFILLMENT_STATUS.ISSUE_REPORTED
      ? fulfillment.dispute?.previousFulfillmentStatus || FULFILLMENT_STATUS.AWAITING_ADDRESS
      : fulfillment.status;

  fulfillment.status = FULFILLMENT_STATUS.ISSUE_REPORTED;
  if (isActiveEscrowSettlement(fulfillment.settlementStatus)) {
    fulfillment.settlementStatus = SETTLEMENT_STATUS.UNDER_DISPUTE;
  }
  fulfillment.dispute = {
    ...(fulfillment.dispute?.toObject?.() || {}),
    ...report,
    status: DISPUTE_STATUS.OPEN,
    isOpen: true,
    previousFulfillmentStatus: previousStatus,
    reportedBy: req.user._id,
    reportedAt: new Date(),
    sellerResponse: "",
    sellerRespondedAt: undefined,
    adminResolution: "",
    adminReviewedBy: undefined,
    adminReviewedAt: undefined,
  };
  fulfillment.timeline.push(
    buildTimelineEntry({
      status: FULFILLMENT_STATUS.ISSUE_REPORTED,
      title: "Delivery issue reported",
      message: report.description,
      actor: req.user._id,
      actorRole: "Bidder",
    })
  );
  await fulfillment.save();

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  await Promise.all([
    createNotification({
      user: fulfillment.seller?._id || fulfillment.seller,
      auction: auctionId,
      type: "fulfillment",
      title: "Buyer reported a delivery issue",
      message: `${req.user.userName} reported a fulfillment issue. Respond from your seller dashboard.`,
      actionPath: "/seller-dashboard#fulfillment",
    }),
    notifySuperAdmins({
      auction: auctionId,
      title: "Delivery dispute opened",
      message: `${req.user.userName} opened a delivery dispute that may need admin review.`,
      actionPath: "/dashboard#disputes",
    }),
  ]);

  const populated = await populateFulfillment(fulfillment._id);

  return res.status(200).json({
    success: true,
    message: "Delivery issue reported",
    fulfillment: populated,
  });
});

export const respondToFulfillmentIssue = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "auction ID");

  const fulfillment = await Fulfillment.findOne({
    auction: id,
    seller: req.user._id,
  });
  if (!fulfillment) {
    const err = new Error("Fulfillment record not found for this auction");
    err.statusCode = 404;
    return next(err);
  }

  if (!fulfillment.dispute?.isOpen) {
    const err = new Error("No open delivery issue found for this auction");
    err.statusCode = 400;
    return next(err);
  }

  const { sellerResponse } = normalizeDisputeResponse(req.body);
  fulfillment.status = FULFILLMENT_STATUS.ISSUE_REPORTED;
  fulfillment.dispute = {
    ...(fulfillment.dispute?.toObject?.() || {}),
    isOpen: true,
    status: DISPUTE_STATUS.SELLER_RESPONDED,
    sellerResponse,
    sellerRespondedAt: new Date(),
  };
  fulfillment.timeline.push(
    buildTimelineEntry({
      status: FULFILLMENT_STATUS.ISSUE_REPORTED,
      title: "Seller responded to issue",
      message: sellerResponse,
      actor: req.user._id,
      actorRole: "Auctioneer",
    })
  );
  await fulfillment.save();

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  await Promise.all([
    createNotification({
      user: fulfillment.bidder,
      auction: auctionId,
      type: "fulfillment",
      title: "Seller responded to your issue",
      message: sellerResponse,
      actionPath: "/won-auctions",
    }),
    notifySuperAdmins({
      auction: auctionId,
      title: "Seller response added",
      message: "A seller responded to an open delivery dispute.",
      actionPath: "/dashboard#disputes",
    }),
  ]);

  const populated = await populateFulfillment(fulfillment._id);

  return res.status(200).json({
    success: true,
    message: "Issue response saved",
    fulfillment: populated,
  });
});

export const fetchFulfillmentDisputes = asyncErrorHandler(async (req, res, next) => {
  const { status = "Open" } = req.query;
  const query = { "dispute.status": { $exists: true } };

  if (status === "Open") {
    query["dispute.isOpen"] = true;
  } else if (status === "Closed") {
    query["dispute.isOpen"] = false;
  } else if (status !== "All") {
    if (!Object.values(DISPUTE_STATUS).includes(status)) {
      const err = new Error("Invalid dispute status filter");
      err.statusCode = 400;
      return next(err);
    }
    query["dispute.status"] = status;
  }

  const disputes = await Fulfillment.find(query)
    .populate(fulfillmentPopulate)
    .sort({ "dispute.reportedAt": -1, updatedAt: -1 })
    .limit(100);

  return res.status(200).json({
    success: true,
    disputes,
  });
});

const buildSettlementFilterQuery = (status) => {
  if (status === "Review") {
    return {
      settlementStatus: {
        $in: [SETTLEMENT_STATUS.READY_TO_RELEASE, SETTLEMENT_STATUS.NEEDS_REVIEW],
      },
      "dispute.isOpen": { $ne: true },
    };
  }
  if (status === "Active") {
    return {
      settlementStatus: { $in: activeEscrowSettlementStatuses },
    };
  }
  if (status === "Finalized") {
    return {
      settlementStatus: {
        $in: [
          SETTLEMENT_STATUS.RELEASED_TO_SELLER,
          SETTLEMENT_STATUS.REFUNDED_TO_BUYER,
        ],
      },
    };
  }
  if (status === "All") {
    return {};
  }
  if (Object.values(SETTLEMENT_STATUS).includes(status)) {
    return { settlementStatus: status };
  }
  return null;
};

const fetchSettlementList = (query) =>
  Fulfillment.find(query)
    .populate(fulfillmentPopulate)
    .sort({ updatedAt: -1 })
    .limit(100);

export const fetchFulfillmentSettlements = asyncErrorHandler(async (req, res, next) => {
  const { status = "Review" } = req.query;
  const query = buildSettlementFilterQuery(status);
  if (!query) {
    const err = new Error("Invalid settlement status filter");
    err.statusCode = 400;
    return next(err);
  }

  const settlements = await fetchSettlementList(query);

  return res.status(200).json({
    success: true,
    settlements,
  });
});

export const reviewFulfillmentSettlement = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "fulfillment ID");

  const fulfillment = await Fulfillment.findById(id);
  if (!fulfillment) {
    const err = new Error("Fulfillment settlement not found");
    err.statusCode = 404;
    return next(err);
  }
  if (fulfillment.dispute?.isOpen) {
    const err = new Error("Resolve the open delivery dispute before settling escrow");
    err.statusCode = 409;
    return next(err);
  }
  const capturedEscrowAmount = Number(fulfillment.settlement?.escrowAmount || 0);
  if (!Number.isFinite(capturedEscrowAmount) || capturedEscrowAmount <= 0) {
    const err = new Error("Captured escrow is not available for this fulfillment");
    err.statusCode = 409;
    return next(err);
  }
  if (!isActiveEscrowSettlement(fulfillment.settlementStatus)) {
    const err = new Error("Escrow is not available for this fulfillment");
    err.statusCode = 409;
    return next(err);
  }

  const review = normalizeAdminSettlementReview(req.body);
  let settlementResult = null;
  await runWithOptionalTransaction(async ({ session }) => {
    if (review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER) {
      settlementResult = await releaseEscrowToSeller({
        fulfillment,
        actor: req.user._id,
        actorRole: "Super Admin",
        note: review.adminResolution,
        session,
      });
    } else {
      settlementResult = await refundEscrowToBuyer({
        fulfillment,
        actor: req.user._id,
        actorRole: "Super Admin",
        note: review.adminResolution,
        session,
      });
    }
  });

  await AuditLog.create({
    actor: req.user._id,
    action: "ESCROW_SETTLEMENT_REVIEWED",
    targetType: "Fulfillment",
    targetId: fulfillment._id,
    summary:
      review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER
        ? "Escrow released to seller"
        : "Escrow refunded to buyer",
  });

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  const title =
    review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER
      ? "Escrow released"
      : "Escrow refunded";
  const buyerMessage =
    review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER
      ? "Admin reviewed the order and released escrow to the seller."
      : "Admin reviewed the order and refunded the winning amount to your wallet.";
  const sellerMessage =
    review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER
      ? "Admin reviewed the order and released seller proceeds to your wallet."
      : "Admin reviewed the order and refunded escrow to the buyer.";

  await Promise.all([
    createNotification({
      user: fulfillment.bidder,
      auction: auctionId,
      type: "wallet",
      title,
      message: buyerMessage,
      actionPath: "/won-auctions",
    }),
    createNotification({
      user: fulfillment.seller,
      auction: auctionId,
      type: "wallet",
      title,
      message: sellerMessage,
      actionPath: "/seller-dashboard#fulfillment",
    }),
  ]);

  return res.status(200).json({
    success: true,
    message:
      review.settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER
        ? "Escrow released to seller"
        : "Escrow refunded to buyer",
    fulfillment: await populateFulfillment(fulfillment._id),
    settlement: settlementResult,
    settlements: await fetchSettlementList(buildSettlementFilterQuery("Review")),
  });
});

export const reviewFulfillmentDispute = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  assertObjectId(id, "fulfillment ID");

  const fulfillment = await Fulfillment.findById(id);
  if (!fulfillment || !fulfillment.dispute?.status) {
    const err = new Error("Delivery dispute not found");
    err.statusCode = 404;
    return next(err);
  }

  const review = normalizeAdminDisputeReview(req.body);
  let settlementAction = review.settlementAction;
  if (
    review.isFinal &&
    settlementAction === SETTLEMENT_ACTION.NONE &&
    review.status === DISPUTE_STATUS.SELLER_FAVORED
  ) {
    settlementAction = SETTLEMENT_ACTION.RELEASE_TO_SELLER;
  }
  if (
    review.isFinal &&
    settlementAction === SETTLEMENT_ACTION.NONE &&
    review.status === DISPUTE_STATUS.BUYER_FAVORED
  ) {
    settlementAction = SETTLEMENT_ACTION.REFUND_BUYER;
  }
  if (
    review.isFinal &&
    settlementAction === SETTLEMENT_ACTION.NONE &&
    isActiveEscrowSettlement(fulfillment.settlementStatus)
  ) {
    const err = new Error("Choose whether to release escrow or refund the buyer");
    err.statusCode = 400;
    return next(err);
  }
  if (!review.isFinal && settlementAction !== SETTLEMENT_ACTION.NONE) {
    const err = new Error("Settlement action requires a final dispute decision");
    err.statusCode = 400;
    return next(err);
  }

  fulfillment.dispute = {
    ...(fulfillment.dispute?.toObject?.() || {}),
    status: review.status,
    isOpen: !review.isFinal,
    adminResolution: review.adminResolution,
    adminReviewedBy: req.user._id,
    adminReviewedAt: new Date(),
  };

  if (review.isFinal && fulfillment.status === FULFILLMENT_STATUS.ISSUE_REPORTED) {
    fulfillment.status =
      fulfillment.dispute.previousFulfillmentStatus || FULFILLMENT_STATUS.AWAITING_ADDRESS;
  } else if (!review.isFinal) {
    fulfillment.status = FULFILLMENT_STATUS.ISSUE_REPORTED;
    if (isActiveEscrowSettlement(fulfillment.settlementStatus)) {
      fulfillment.settlementStatus = SETTLEMENT_STATUS.UNDER_DISPUTE;
    }
  }

  const title = review.isFinal ? "Delivery dispute resolved" : "Delivery dispute reviewed";
  const message =
    review.adminResolution ||
    (review.status === DISPUTE_STATUS.NEEDS_MORE_INFO
      ? "Admin requested more information about the delivery issue."
      : `Admin marked the dispute as ${review.status}.`);

  fulfillment.timeline.push(
    buildTimelineEntry({
      status: fulfillment.status,
      title,
      message,
      actor: req.user._id,
      actorRole: "Super Admin",
    })
  );

  let settlementResult = null;
  await runWithOptionalTransaction(async ({ session }) => {
    if (settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER) {
      settlementResult = await releaseEscrowToSeller({
        fulfillment,
        actor: req.user._id,
        actorRole: "Super Admin",
        note: review.adminResolution || "Admin released escrow to the seller",
        session,
      });
    } else if (settlementAction === SETTLEMENT_ACTION.REFUND_BUYER) {
      settlementResult = await refundEscrowToBuyer({
        fulfillment,
        actor: req.user._id,
        actorRole: "Super Admin",
        note: review.adminResolution || "Admin refunded escrow to the buyer",
        session,
      });
    } else {
      await fulfillment.save({ session });
    }
  });

  await AuditLog.create({
    actor: req.user._id,
    action: "DISPUTE_REVIEWED",
    targetType: "Fulfillment",
    targetId: fulfillment._id,
    summary: `Dispute marked ${review.status}`,
  });

  const auctionId = fulfillment.auction?._id || fulfillment.auction;
  await Promise.all([
    createNotification({
      user: fulfillment.bidder,
      auction: auctionId,
      type: "admin",
      title,
      message,
      actionPath: "/won-auctions",
    }),
    createNotification({
      user: fulfillment.seller,
      auction: auctionId,
      type: "admin",
      title,
      message,
      actionPath: "/seller-dashboard#fulfillment",
    }),
  ]);

  if (settlementAction === SETTLEMENT_ACTION.RELEASE_TO_SELLER) {
    await createNotification({
      user: fulfillment.seller,
      auction: auctionId,
      type: "wallet",
      title: "Escrow released",
      message: "Admin resolved the dispute and released seller proceeds.",
      actionPath: "/wallet",
    });
  }
  if (settlementAction === SETTLEMENT_ACTION.REFUND_BUYER) {
    await createNotification({
      user: fulfillment.bidder,
      auction: auctionId,
      type: "wallet",
      title: "Escrow refunded",
      message: "Admin resolved the dispute and refunded the winning amount to your wallet.",
      actionPath: "/wallet",
    });
  }

  if (review.status === DISPUTE_STATUS.SELLER_FAVORED) {
    await User.findByIdAndUpdate(fulfillment.bidder, {
      $inc: { "buyerStats.disputesLost": 1 },
    });
  }

  const disputes = await Fulfillment.find({ "dispute.status": { $exists: true } })
    .populate(fulfillmentPopulate)
    .sort({ "dispute.reportedAt": -1, updatedAt: -1 })
    .limit(100);

  return res.status(200).json({
    success: true,
    message: "Dispute review saved",
    fulfillment: await populateFulfillment(fulfillment._id),
    settlement: settlementResult,
    disputes,
  });
});
