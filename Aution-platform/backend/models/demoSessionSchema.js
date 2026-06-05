import mongoose from "mongoose";

const personaUserIdsSchema = new mongoose.Schema(
  {
    Bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    Auctioneer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    "Super Admin": {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const demoSessionSchema = new mongoose.Schema(
  {
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Ended", "Expired"],
      default: "Active",
      index: true,
    },
    personaUserIds: {
      type: personaUserIdsSchema,
      default: () => ({}),
    },
    conversionTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    ipHash: {
      type: String,
      index: true,
    },
    userAgentHash: {
      type: String,
    },
    endedAt: Date,
  },
  { timestamps: true }
);

demoSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
demoSessionSchema.index({ ipHash: 1, createdAt: -1 });

const DemoSession = mongoose.model("DemoSession", demoSessionSchema);

export default DemoSession;
