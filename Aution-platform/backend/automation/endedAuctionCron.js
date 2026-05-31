import cron from "node-cron";
import Auction from "../models/auctionSchema.js";

import User from "../models/userSchema.js";

import Notification from "../models/notificationSchema.js";

import { createNotification } from "../utils/notifications.js";
import { closeEndedAuctions } from "../utils/auctionClosing.js";

export const runEndedAuctionTasks = async () => {
  const now = new Date();
  if (process.env.NODE_ENV !== "production") {
    console.log("Cron for ended auction running...");
  }
  const endingSoonAuctions = await Auction.find({
    status: { $ne: "Draft" },
    endTime: {
      $gt: now,
      $lte: new Date(now.getTime() + 15 * 60 * 1000),
    },
  });
  for (const auction of endingSoonAuctions) {
    const watchers = await User.find({ watchlist: auction._id });
    const bidderIds = auction.bids.map((bid) => bid.userId).filter(Boolean);
    const notifyUsers = [
      ...new Set([
        ...watchers.map((user) => user._id.toString()),
        ...bidderIds.map((id) => id.toString()),
      ]),
    ];
    for (const userId of notifyUsers) {
      const existingReminder = await Notification.findOne({
        user: userId,
        auction: auction._id,
        type: "ending_soon",
      });
      if (!existingReminder) {
        await createNotification({
          user: userId,
          auction: auction._id,
          type: "ending_soon",
          title: "Auction ending soon",
          message: `${auction.title} is ending soon.`,
        });
      }
    }
  }
  const closeResult = await closeEndedAuctions({
    now,
    reason: "cron",
    limit: 100,
  });

  return {
    endingSoonCount: endingSoonAuctions.length,
    endedCount: closeResult.closedCount,
    attemptedCloseCount: closeResult.attemptedCount,
    failedCloseCount: closeResult.failedCount,
  };
};

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    await runEndedAuctionTasks();
  });
};
