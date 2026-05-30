import mongoose from "mongoose";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Auction from "../models/auctionSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import { createNotification } from "../utils/notifications.js";
import {
  FULFILLMENT_STATUS,
  buildTimelineEntry,
  normalizeDeliveryAddress,
  sellerManagedStatuses,
} from "../utils/fulfillment.js";

const fulfillmentPopulate = [
  { path: "auction", select: "title image currentBid endTime" },
  { path: "bidder", select: "userName email phone profileImage" },
  { path: "seller", select: "userName email phone reputation" },
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
      message: "The seller marked the order as delivered.",
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
