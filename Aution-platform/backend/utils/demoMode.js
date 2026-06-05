import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connection, DATABASE_MODES } from "../db/connection.js";
import Auction from "../models/auctionSchema.js";
import AuditLog from "../models/auditLogSchema.js";
import Bid from "../models/bidSchema.js";
import Commission from "../models/commissionSchema.js";
import DemoSession from "../models/demoSessionSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import Notification from "../models/notificationSchema.js";
import Paymentproof from "../models/paymentproofSchema.js";
import PlatformAccount from "../models/platformAccountSchema.js";
import PlatformTransaction from "../models/platformTransactionSchema.js";
import Review from "../models/reviewSchema.js";
import User from "../models/userSchema.js";
import WalletTransaction from "../models/walletTransactionSchema.js";
import WithdrawalRequest from "../models/withdrawalRequestSchema.js";
import { SETTLEMENT_STATUS, buildTimelineEntry } from "./fulfillment.js";
import {
  getDemoMaxSessionsPerSourcePerHour,
  getDemoSessionTtlHours,
  isDemoModeEnabled,
  runWithDemoDatabase,
  runWithProductionDatabase,
  runWithDemoScope,
} from "./demoScope.js";
import { createNotification } from "./notifications.js";

export const DEMO_PERSONAS = Object.freeze({
  BIDDER: "Bidder",
  AUCTIONEER: "Auctioneer",
  SUPER_ADMIN: "Super Admin",
});

const demoModels = [
  Auction,
  AuditLog,
  Bid,
  Commission,
  Fulfillment,
  Notification,
  Paymentproof,
  PlatformAccount,
  PlatformTransaction,
  Review,
  User,
  WalletTransaction,
  WithdrawalRequest,
];

const demoImage = (name) => ({
  public_id: `demo/${name}`,
  url: "/imageHolder.jpg",
});

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

export const normalizeDemoPersona = (persona) => {
  const cleaned = String(persona || "").trim().toLowerCase();
  if (cleaned === "auctioneer" || cleaned === "seller") {
    return DEMO_PERSONAS.AUCTIONEER;
  }
  if (cleaned === "super admin" || cleaned === "admin" || cleaned === "superadmin") {
    return DEMO_PERSONAS.SUPER_ADMIN;
  }
  return DEMO_PERSONAS.BIDDER;
};

export const getDemoDashboardPath = (persona) => {
  const normalized = normalizeDemoPersona(persona);
  if (normalized === DEMO_PERSONAS.AUCTIONEER) return "/seller-dashboard";
  if (normalized === DEMO_PERSONAS.SUPER_ADMIN) return "/dashboard";
  return "/bidder-dashboard";
};

const hashValue = (value) =>
  crypto
    .createHash("sha256")
    .update(`${process.env.JWT_SECRET || "primebid"}:${value || "unknown"}`)
    .digest("hex");

const getRequestIp = (req) =>
  String(req.headers?.["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();

const getCookieOptions = (expires) => {
  const isProduction = process.env.NODE_ENV === "production";
  const secureCookie = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction;

  return {
    expires,
    httpOnly: true,
    sameSite: secureCookie ? "None" : "Lax",
    secure: secureCookie,
  };
};

export const issueDemoAuthToken = ({ user, demoSession, persona, res }) => {
  const expiresAt = new Date(demoSession.expiresAt);
  const expiresIn = Math.max(
    60,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  );
  const token = jwt.sign(
    {
      id: user._id,
      mode: DATABASE_MODES.DEMO,
      isDemo: true,
      demoSessionId: demoSession._id,
      demoPersona: normalizeDemoPersona(persona || user.role),
      demoExpiresAt: expiresAt.toISOString(),
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  res.cookie("demoToken", token, getCookieOptions(expiresAt));
  return token;
};

export const clearDemoAuthCookie = (res) => {
  res.cookie("demoToken", null, getCookieOptions(new Date(Date.now())));
};

const buildPhone = () => `8${crypto.randomInt(100000000, 999999999)}`;

const createDemoUser = async ({
  sessionId,
  suffix,
  role,
  userName,
  wallet,
  kycStatus = "Approved",
  reputation,
}) => {
  const password = await bcrypt.hash(crypto.randomBytes(18).toString("hex"), 10);
  return User.create({
    userName,
    email: `demo-${suffix}-${sessionId}@primebid.local`,
    password,
    address: "PrimeBid demo sandbox",
    phone: buildPhone(),
    role,
    accountStatus: "Active",
    kycStatus,
    reputation,
    wallet,
    paymentMethods:
      role === DEMO_PERSONAS.AUCTIONEER
        ? {
            bankTransfer: {
              bankAccountName: userName,
              bankAccountNumber: `DEMO${String(sessionId).slice(-8).toUpperCase()}${suffix
                .slice(0, 2)
                .toUpperCase()}`,
              bankIFSCCode: "DEMO0001234",
              bankName: "Demo Bank",
            },
          }
        : undefined,
    profileImage: demoImage(`${suffix}-avatar`),
  });
};

const createBid = async ({ auction, user, amount, lockedAmount = 0, isAutoBid = false }) => {
  const bid = await Bid.create({
    amount,
    lockedAmount,
    isAutoBid,
    bidder: {
      id: user._id,
      userName: user.userName,
      profileImage: user.profileImage?.url,
    },
    auctionItem: auction._id,
  });

  auction.bids.push({
    userId: user._id,
    userName: user.userName,
    profileImage: user.profileImage?.url,
    amount,
    lockedAmount,
    isAutoBid,
  });
  return bid;
};

const createWalletTransaction = (payload) =>
  WalletTransaction.create({
    status: "Completed",
    paymentMethod: "Wallet",
    ...payload,
  });

const createDemoFixtures = async ({ demoSession }) => {
  const sessionId = demoSession._id.toString();
  const now = new Date();

  const bidder = await createDemoUser({
    sessionId,
    suffix: "bidder",
    role: DEMO_PERSONAS.BIDDER,
    userName: "Demo Bidder",
    wallet: {
      availableBalance: 88000,
      lockedBalance: 35000,
      lifetimeDeposited: 185000,
      lifetimeWithdrawn: 0,
    },
  });
  const auctioneer = await createDemoUser({
    sessionId,
    suffix: "auctioneer",
    role: DEMO_PERSONAS.AUCTIONEER,
    userName: "Demo Auctioneer",
    wallet: {
      availableBalance: 42000,
      lockedBalance: 12000,
      lifetimeDeposited: 0,
      lifetimeWithdrawn: 18000,
    },
    reputation: { ratingAverage: 4.7, ratingCount: 18 },
  });
  const admin = await createDemoUser({
    sessionId,
    suffix: "admin",
    role: DEMO_PERSONAS.SUPER_ADMIN,
    userName: "Demo Super Admin",
    wallet: {},
  });
  const otherBidder = await createDemoUser({
    sessionId,
    suffix: "rival-bidder",
    role: DEMO_PERSONAS.BIDDER,
    userName: "Rival Demo Bidder",
    wallet: { availableBalance: 95000, lockedBalance: 0, lifetimeDeposited: 95000 },
  });
  const otherSeller = await createDemoUser({
    sessionId,
    suffix: "seller",
    role: DEMO_PERSONAS.AUCTIONEER,
    userName: "Second Demo Seller",
    wallet: { availableBalance: 15000, lockedBalance: 0 },
    reputation: { ratingAverage: 4.2, ratingCount: 7 },
  });
  const pendingSeller = await createDemoUser({
    sessionId,
    suffix: "pending-kyc",
    role: DEMO_PERSONAS.AUCTIONEER,
    userName: "Pending KYC Seller",
    wallet: { availableBalance: 0, lockedBalance: 0 },
    kycStatus: "Pending",
  });

  const liveAuction = await Auction.create({
    title: "Demo: Vintage Mechanical Watch",
    description:
      "A wallet-backed live auction with an active bid hold. Use this to try raising your bid safely.",
    startTime: addMinutes(now, -20),
    endTime: addMinutes(now, 75),
    category: "Jewelry & Watches",
    condition: "Used",
    startingBid: 15000,
    currentBid: 35000,
    minimumBidIncrement: 1000,
    status: "Published",
    qualityScore: 84,
    image: demoImage("watch"),
    createdBy: auctioneer._id,
  });
  const liveBid = await createBid({
    auction: liveAuction,
    user: bidder,
    amount: 35000,
    lockedAmount: 35000,
  });
  await createBid({
    auction: liveAuction,
    user: otherBidder,
    amount: 30000,
    lockedAmount: 0,
  });
  liveAuction.lastBidAt = addMinutes(now, -4);
  await liveAuction.save();

  const outbidAuction = await Auction.create({
    title: "Demo: Studio Camera Kit",
    description:
      "A live auction where the demo bidder was outbid. It demonstrates notifications and bid history without locking funds.",
    startTime: addMinutes(now, -45),
    endTime: addMinutes(now, 110),
    category: "Electronics",
    condition: "Used",
    startingBid: 10000,
    currentBid: 22000,
    minimumBidIncrement: 1000,
    status: "Published",
    qualityScore: 79,
    image: demoImage("camera"),
    createdBy: otherSeller._id,
  });
  await createBid({
    auction: outbidAuction,
    user: bidder,
    amount: 18000,
    lockedAmount: 0,
  });
  await createBid({
    auction: outbidAuction,
    user: otherBidder,
    amount: 22000,
    lockedAmount: 22000,
  });
  outbidAuction.lastBidAt = addMinutes(now, -6);
  await outbidAuction.save();

  const upcomingAuction = await Auction.create({
    title: "Demo: Signed Cricket Bat",
    description:
      "An upcoming listing that shows how watchlists and auction scheduling behave before bidding opens.",
    startTime: addMinutes(now, 150),
    endTime: addMinutes(now, 390),
    category: "Sports Memorabilia",
    condition: "Used",
    startingBid: 8000,
    currentBid: 8000,
    minimumBidIncrement: 500,
    status: "Published",
    qualityScore: 72,
    image: demoImage("bat"),
    createdBy: auctioneer._id,
  });

  const wonAuction = await Auction.create({
    title: "Demo: Refurbished Laptop Pro",
    description:
      "A completed demo win. Add a delivery address from the Won Auctions page to unlock seller shipping.",
    startTime: addMinutes(now, -240),
    endTime: addMinutes(now, -60),
    category: "Electronics",
    condition: "Used",
    startingBid: 30000,
    currentBid: 62000,
    minimumBidIncrement: 1000,
    status: "Published",
    qualityScore: 89,
    image: demoImage("laptop"),
    createdBy: auctioneer._id,
    highestBidder: bidder._id,
    closedAt: addMinutes(now, -58),
    closureStatus: "Closed",
    commissionCalculated: true,
    winnerStatsRecorded: true,
  });
  const wonBid = await createBid({
    auction: wonAuction,
    user: bidder,
    amount: 62000,
    lockedAmount: 0,
  });
  await wonAuction.save();

  const readyAuction = await Auction.create({
    title: "Demo: Walnut Coffee Table",
    description:
      "A completed sale with buyer address already added, ready for the auctioneer to mark shipped.",
    startTime: addMinutes(now, -420),
    endTime: addMinutes(now, -240),
    category: "Furniture",
    condition: "Used",
    startingBid: 9000,
    currentBid: 26000,
    minimumBidIncrement: 500,
    status: "Published",
    qualityScore: 81,
    image: demoImage("table"),
    createdBy: auctioneer._id,
    highestBidder: otherBidder._id,
    closedAt: addMinutes(now, -238),
    closureStatus: "Closed",
    commissionCalculated: true,
    winnerStatsRecorded: true,
  });
  const readyBid = await createBid({
    auction: readyAuction,
    user: otherBidder,
    amount: 26000,
    lockedAmount: 0,
  });
  await readyAuction.save();

  const disputeAuction = await Auction.create({
    title: "Demo: Collector Coin Set",
    description:
      "A fulfilled order with an open delivery issue for the demo admin and auctioneer to review.",
    startTime: addMinutes(now, -720),
    endTime: addMinutes(now, -540),
    category: "Collectibles",
    condition: "Used",
    startingBid: 5000,
    currentBid: 14500,
    minimumBidIncrement: 500,
    status: "Published",
    qualityScore: 68,
    image: demoImage("coins"),
    createdBy: auctioneer._id,
    highestBidder: otherBidder._id,
    closedAt: addMinutes(now, -538),
    closureStatus: "Closed",
    commissionCalculated: true,
    winnerStatsRecorded: true,
  });
  const disputeBid = await createBid({
    auction: disputeAuction,
    user: otherBidder,
    amount: 14500,
    lockedAmount: 0,
  });
  await disputeAuction.save();

  bidder.watchlist = [liveAuction._id, upcomingAuction._id, outbidAuction._id];
  bidder.moneySpent = 62000;
  bidder.auctionsWon = 1;
  await bidder.save();

  await Promise.all([
    createWalletTransaction({
      user: bidder._id,
      type: "TOP_UP",
      amount: 185000,
      availableBefore: 0,
      availableAfter: 185000,
      lockedBefore: 0,
      lockedAfter: 0,
      paymentMethod: "UPI",
      reference: "DEMO-UPI-TOPUP",
      note: "Demo wallet credited with sandbox funds",
    }),
    createWalletTransaction({
      user: bidder._id,
      type: "BID_LOCK",
      amount: 35000,
      availableBefore: 123000,
      availableAfter: 88000,
      lockedBefore: 0,
      lockedAfter: 35000,
      auction: liveAuction._id,
      bid: liveBid._id,
      note: "Demo live bid hold",
    }),
    createWalletTransaction({
      user: bidder._id,
      type: "BID_CAPTURED",
      amount: 62000,
      availableBefore: 185000,
      availableAfter: 123000,
      lockedBefore: 0,
      lockedAfter: 0,
      auction: wonAuction._id,
      bid: wonBid._id,
      note: "Demo winning bid captured into escrow",
    }),
    createWalletTransaction({
      user: auctioneer._id,
      type: "SALE_CREDIT",
      amount: 42000,
      availableBefore: 0,
      availableAfter: 42000,
      lockedBefore: 0,
      lockedAfter: 0,
      auction: disputeAuction._id,
      note: "Demo seller proceeds from a completed order",
    }),
  ]);

  await Promise.all([
    Fulfillment.create({
      auction: wonAuction._id,
      bidder: bidder._id,
      seller: auctioneer._id,
      winningBid: wonBid._id,
      winningAmount: 62000,
      settlementStatus: SETTLEMENT_STATUS.HELD_IN_ESCROW,
      settlement: {
        escrowAmount: 62000,
        commissionAmount: 3100,
        sellerPayoutAmount: 58900,
        capturedAt: addMinutes(now, -58),
      },
      status: "AwaitingAddress",
      timeline: [
        buildTimelineEntry({
          status: "AwaitingAddress",
          title: "Delivery address requested",
          message: "The winner needs to add delivery details before shipment.",
        }),
      ],
    }),
    Fulfillment.create({
      auction: readyAuction._id,
      bidder: otherBidder._id,
      seller: auctioneer._id,
      winningBid: readyBid._id,
      winningAmount: 26000,
      settlementStatus: SETTLEMENT_STATUS.HELD_IN_ESCROW,
      settlement: {
        escrowAmount: 26000,
        commissionAmount: 1300,
        sellerPayoutAmount: 24700,
        capturedAt: addMinutes(now, -236),
      },
      status: "ReadyToShip",
      deliveryAddress: {
        fullName: "Rival Demo Bidder",
        phone: "8888888888",
        addressLine1: "221 Demo Street",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
      addressSubmittedAt: addMinutes(now, -220),
      timeline: [
        buildTimelineEntry({
          status: "ReadyToShip",
          title: "Delivery address submitted",
          message: "The winner added delivery details.",
        }),
      ],
    }),
    Fulfillment.create({
      auction: disputeAuction._id,
      bidder: otherBidder._id,
      seller: auctioneer._id,
      winningBid: disputeBid._id,
      winningAmount: 14500,
      settlementStatus: SETTLEMENT_STATUS.UNDER_DISPUTE,
      settlement: {
        escrowAmount: 14500,
        commissionAmount: 725,
        sellerPayoutAmount: 13775,
        capturedAt: addMinutes(now, -536),
      },
      status: "IssueReported",
      deliveryAddress: {
        fullName: "Rival Demo Bidder",
        phone: "8888888888",
        addressLine1: "44 Sandbox Road",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      shipping: {
        carrier: "DemoShip",
        trackingNumber: "DEMO123456",
        shippedAt: addMinutes(now, -500),
        deliveredAt: addMinutes(now, -460),
      },
      dispute: {
        isOpen: true,
        issueType: "DamagedItem",
        description: "The demo package arrived with a damaged outer box.",
        status: "Open",
        previousFulfillmentStatus: "Delivered",
        reportedBy: otherBidder._id,
        reportedAt: addMinutes(now, -430),
      },
      timeline: [
        buildTimelineEntry({
          status: "IssueReported",
          title: "Delivery issue reported",
          message: "The buyer reported a demo delivery issue.",
        }),
      ],
    }),
  ]);

  await Promise.all([
    WithdrawalRequest.create({
      user: auctioneer._id,
      amount: 12000,
      status: "Pending",
      bankDetailsSnapshot: {
        bankAccountNumber: auctioneer.paymentMethods.bankTransfer.bankAccountNumber,
        bankAccountName: auctioneer.userName,
        bankIFSCCode: "DEMO0001234",
        bankName: "Demo Bank",
      },
    }),
    Review.create({
      auction: disputeAuction._id,
      reviewer: otherBidder._id,
      seller: auctioneer._id,
      rating: 4,
      comment: "Demo seller kept communication clear during fulfillment.",
    }),
    AuditLog.create({
      actor: admin._id,
      action: "DEMO_SESSION_CREATED",
      targetType: "DemoSession",
      targetId: demoSession._id,
      summary: "Demo sandbox seeded with bidder, seller, and admin workflows",
    }),
  ]);

  await Promise.all([
    createNotification({
      user: bidder._id,
      auction: wonAuction._id,
      type: "auction_won",
      title: "You won a demo auction",
      message: "Add a delivery address for the demo laptop so the seller can ship.",
      actionPath: `/won-auctions#won-auction-${wonAuction._id}`,
      dedupeKey: `demo:${sessionId}:won-address`,
    }),
    createNotification({
      user: bidder._id,
      auction: outbidAuction._id,
      type: "outbid",
      title: "You were outbid in demo",
      message: "Try placing another bid on the camera kit before it closes.",
      actionPath: `/auction/item/${outbidAuction._id}`,
      dedupeKey: `demo:${sessionId}:outbid`,
    }),
    createNotification({
      user: auctioneer._id,
      auction: readyAuction._id,
      type: "fulfillment",
      title: "Demo order ready to ship",
      message: "A buyer address is available for the coffee table sale.",
      actionPath: "/seller-dashboard#fulfillment",
      dedupeKey: `demo:${sessionId}:seller-ship`,
    }),
    createNotification({
      user: admin._id,
      type: "admin",
      title: "Demo queue ready",
      message: "Review sandbox KYC, withdrawals, disputes, and settlement queues.",
      actionPath: "/dashboard",
      dedupeKey: `demo:${sessionId}:admin-ready`,
    }),
  ]);

  demoSession.personaUserIds = {
    [DEMO_PERSONAS.BIDDER]: bidder._id,
    [DEMO_PERSONAS.AUCTIONEER]: auctioneer._id,
    [DEMO_PERSONAS.SUPER_ADMIN]: admin._id,
  };
  await demoSession.save();

  return {
    bidder,
    auctioneer,
    admin,
  };
};

export const startDemoSession = async ({ req, persona }) => {
  if (!isDemoModeEnabled()) {
    const err = new Error("Demo mode is not enabled");
    err.statusCode = 403;
    throw err;
  }

  await connection(DATABASE_MODES.DEMO);

  return runWithDemoDatabase(async () => {
    const ipHash = hashValue(getRequestIp(req));
    const userAgentHash = hashValue(req.get?.("user-agent") || "");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sessionCount = await DemoSession.countDocuments({
      ipHash,
      createdAt: { $gte: oneHourAgo },
    });
    if (sessionCount >= getDemoMaxSessionsPerSourcePerHour()) {
      const err = new Error("Too many demo sessions started from this network. Please try again later.");
      err.statusCode = 429;
      throw err;
    }

    const conversionToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + getDemoSessionTtlHours() * 60 * 60 * 1000);
    const demoSession = await DemoSession.create({
      expiresAt,
      status: "Active",
      conversionTokenHash: hashValue(conversionToken),
      ipHash,
      userAgentHash,
    });

    const personas = await runWithDemoScope(
      {
        databaseMode: DATABASE_MODES.DEMO,
        isDemo: true,
        demoSessionId: demoSession._id,
        demoExpiresAt: expiresAt,
      },
      () => createDemoFixtures({ demoSession })
    );

    const selectedPersona = normalizeDemoPersona(persona);
    const user =
      selectedPersona === DEMO_PERSONAS.AUCTIONEER
        ? personas.auctioneer
        : selectedPersona === DEMO_PERSONAS.SUPER_ADMIN
          ? personas.admin
          : personas.bidder;

    return {
      demoSession,
      user,
      persona: selectedPersona,
      conversionToken,
    };
  }, { bypassDemoScope: true });
};

export const switchDemoPersona = async ({ demoSessionId, persona }) => {
  await connection(DATABASE_MODES.DEMO);

  return runWithDemoDatabase(async () => {
    const selectedPersona = normalizeDemoPersona(persona);
    const demoSession = await DemoSession.findOne({
      _id: demoSessionId,
      status: "Active",
      expiresAt: { $gt: new Date() },
    });
    if (!demoSession) {
      const err = new Error("Demo session expired. Please start a new demo.");
      err.statusCode = 401;
      throw err;
    }

    const userId = demoSession.personaUserIds?.[selectedPersona];
    if (!userId) {
      const err = new Error("Demo persona is unavailable");
      err.statusCode = 404;
      throw err;
    }

    const user = await runWithDemoScope(
      {
        databaseMode: DATABASE_MODES.DEMO,
        isDemo: true,
        demoSessionId: demoSession._id,
        demoExpiresAt: demoSession.expiresAt,
      },
      () => User.findById(userId)
    );
    if (!user) {
      const err = new Error("Demo persona is unavailable");
      err.statusCode = 404;
      throw err;
    }

    return {
      demoSession,
      user,
      persona: selectedPersona,
    };
  }, { bypassDemoScope: true });
};

export const endDemoSession = async (demoSessionId) => {
  if (!mongoose.Types.ObjectId.isValid(demoSessionId)) return null;
  await connection(DATABASE_MODES.DEMO);
  return runWithDemoDatabase(
    () =>
      DemoSession.findByIdAndUpdate(
        demoSessionId,
        {
          status: "Ended",
          endedAt: new Date(),
        },
        { new: true }
      ),
    { bypassDemoScope: true }
  );
};

export const cleanupExpiredDemoSessions = async ({ now = new Date() } = {}) => {
  if (!isDemoModeEnabled()) {
    return {
      expiredSessionCount: 0,
      deletionResults: {},
      skipped: "Demo database is not configured",
    };
  }

  await connection(DATABASE_MODES.DEMO);

  return runWithDemoDatabase(async () => {
    const expiredSessions = await DemoSession.find({
      $or: [
        { expiresAt: { $lte: now } },
        { status: { $in: ["Ended", "Expired"] }, updatedAt: { $lte: now } },
      ],
    }).select("_id");
    const sessionIds = expiredSessions.map((session) => session._id);

    const deletionResults = {};
    if (sessionIds.length) {
      for (const Model of demoModels) {
        deletionResults[Model.modelName] = await Model.deleteMany({
          isDemo: true,
          demoSessionId: { $in: sessionIds },
        });
      }
    }

    await DemoSession.updateMany(
      {
        _id: { $in: sessionIds },
        status: "Active",
      },
      { status: "Expired" }
    );

    return {
      expiredSessionCount: sessionIds.length,
      deletionResults,
    };
  }, { bypassDemoScope: true });
};

export const convertDemoWatchlist = async ({
  realUser,
  demoSessionId,
  conversionToken,
}) => {
  if (!conversionToken || !mongoose.Types.ObjectId.isValid(demoSessionId)) {
    const err = new Error("Demo conversion token is invalid");
    err.statusCode = 400;
    throw err;
  }

  await connection(DATABASE_MODES.DEMO);

  const demoSession = await runWithDemoDatabase(
    () =>
      DemoSession.findOne({
        _id: demoSessionId,
        conversionTokenHash: hashValue(conversionToken),
        status: "Active",
        expiresAt: { $gt: new Date() },
      }).select("+conversionTokenHash"),
    { bypassDemoScope: true }
  );

  if (!demoSession) {
    const err = new Error("Demo conversion token is invalid or expired");
    err.statusCode = 400;
    throw err;
  }

  if (realUser.role !== DEMO_PERSONAS.BIDDER) {
    return {
      copiedCount: 0,
      watchlist: realUser.watchlist || [],
    };
  }

  const demoBidder = await runWithDemoScope(
    {
      databaseMode: DATABASE_MODES.DEMO,
      isDemo: true,
      demoSessionId: demoSession._id,
      demoExpiresAt: demoSession.expiresAt,
    },
    () =>
      User.findById(demoSession.personaUserIds?.[DEMO_PERSONAS.BIDDER]).populate(
        "watchlist"
      )
  );

  const categories = [
    ...new Set(
      (demoBidder?.watchlist || [])
        .map((auction) => auction?.category)
        .filter(Boolean)
    ),
  ];

  if (!categories.length) {
    return {
      copiedCount: 0,
      watchlist: realUser.watchlist || [],
    };
  }

  const realAuctions = await runWithProductionDatabase(() =>
    Auction.find({
      status: { $ne: "Draft" },
      category: { $in: categories },
      endTime: { $gt: new Date() },
    })
      .select("_id")
      .sort({ endTime: 1 })
      .limit(12)
  );

  if (!realAuctions.length) {
    return {
      copiedCount: 0,
      watchlist: realUser.watchlist || [],
    };
  }

  await runWithProductionDatabase(() =>
    User.findByIdAndUpdate(realUser._id, {
      $addToSet: {
        watchlist: { $each: realAuctions.map((auction) => auction._id) },
      },
    })
  );

  const updatedUser = await runWithProductionDatabase(() =>
    User.findById(realUser._id).populate("watchlist")
  );
  return {
    copiedCount: realAuctions.length,
    watchlist: updatedUser.watchlist || [],
  };
};
