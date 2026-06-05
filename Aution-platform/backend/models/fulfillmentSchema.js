import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    title: String,
    message: String,
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorRole: {
      type: String,
      enum: ["Bidder", "Auctioneer", "System", "Super Admin"],
      default: "System",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const disputeSchema = new mongoose.Schema(
  {
    isOpen: { type: Boolean, default: false },
    issueType: {
      type: String,
      enum: [
        "NotDelivered",
        "DamagedItem",
        "WrongItem",
        "TrackingProblem",
        "SellerUnresponsive",
        "Other",
      ],
    },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "Open",
        "SellerResponded",
        "NeedsMoreInfo",
        "Resolved",
        "BuyerFavored",
        "SellerFavored",
      ],
    },
    previousFulfillmentStatus: {
      type: String,
      enum: [
        "AwaitingAddress",
        "ReadyToShip",
        "Shipped",
        "OutForDelivery",
        "Delivered",
        "IssueReported",
      ],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reportedAt: Date,
    sellerResponse: { type: String, trim: true },
    sellerRespondedAt: Date,
    adminResolution: { type: String, trim: true },
    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminReviewedAt: Date,
  },
  { _id: false }
);

const fulfillmentSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      unique: true,
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    winningBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
    },
    winningAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    settlementStatus: {
      type: String,
      enum: [
        "WalletCaptured",
        "NeedsReview",
        "HeldInEscrow",
        "ReadyToRelease",
        "ReleasedToSeller",
        "RefundedToBuyer",
        "UnderDispute",
      ],
      default: "HeldInEscrow",
    },
    settlement: {
      escrowAmount: { type: Number, default: 0, min: 0 },
      commissionAmount: { type: Number, default: 0, min: 0 },
      sellerPayoutAmount: { type: Number, default: 0, min: 0 },
      capturedAt: Date,
      deliveryConfirmedAt: Date,
      releasedAt: Date,
      refundedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      platformTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlatformTransaction",
      },
      commission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Commission",
      },
      note: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: [
        "AwaitingAddress",
        "ReadyToShip",
        "Shipped",
        "OutForDelivery",
        "Delivered",
        "IssueReported",
      ],
      default: "AwaitingAddress",
    },
    deliveryAddress: deliveryAddressSchema,
    addressSubmittedAt: Date,
    dispute: disputeSchema,
    shipping: {
      carrier: { type: String, trim: true },
      trackingNumber: { type: String, trim: true },
      trackingUrl: { type: String, trim: true },
      estimatedDeliveryDate: Date,
      sellerNote: { type: String, trim: true },
      shippedAt: Date,
      deliveredAt: Date,
    },
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

fulfillmentSchema.plugin(demoScopedModel);

fulfillmentSchema.index({ bidder: 1, updatedAt: -1 });
fulfillmentSchema.index({ seller: 1, status: 1, updatedAt: -1 });
fulfillmentSchema.index({ auction: 1, bidder: 1 });
fulfillmentSchema.index({ "dispute.isOpen": 1, updatedAt: -1 });
fulfillmentSchema.index({ settlementStatus: 1, updatedAt: -1 });

const Fulfillment = mongoose.model("Fulfillment", fulfillmentSchema);

export default Fulfillment;
