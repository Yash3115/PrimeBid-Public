import cron from "node-cron";
import Auction from "../models/auctionSchema.js";

import User from "../models/userSchema.js";

import Bid from "../models/bidSchema.js";
import Notification from "../models/notificationSchema.js";
import Commission from "../models/commissionSchema.js";

import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "../utils/notifications.js";
import { calculateCommission } from "../controllers/commissioncontroller.js";
import { ensureFulfillmentForAuction } from "../utils/fulfillment.js";
import {
  captureWinningBidFunds,
  releaseAuctionBidLocks,
} from "../utils/wallet.js";

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
  const endedAuctions = await Auction.find({
    status: { $ne: "Draft" },
    endTime: { $lte: now },
    commissionCalculated: false,
  });
  for (const auction of endedAuctions) {
    try {
      const commissionAmount = await calculateCommission(auction._id);
      auction.commissionCalculated = true;
      const highestBidder = await Bid.findOne({
        auctionItem: auction._id,
        amount: Number(auction.currentBid),
      }).sort({ amount: -1 });
      const auctioneer = await User.findById(auction.createdBy);
      if (!auctioneer) {
        await auction.save();
        continue;
      }
      if (highestBidder) {
        auction.highestBidder = highestBidder.bidder.id;
        await releaseAuctionBidLocks({
          auction,
          exceptUserId: highestBidder.bidder.id,
          note: "Non-winning bid lock released after auction close",
        });

        const settlement = await captureWinningBidFunds({
          bidderId: highestBidder.bidder.id,
          sellerId: auctioneer._id,
          auctionId: auction._id,
          bidId: highestBidder._id,
          grossAmount: highestBidder.amount,
          commissionAmount,
        });

        const winningBidEntry = auction.bids.find(
          (bid) =>
            bid.userId?.toString() === highestBidder.bidder.id?.toString()
        );
        if (winningBidEntry && settlement.settled) {
          winningBidEntry.lockedAmount = 0;
        }
        await auction.save();

        const { created: fulfillmentCreated } = await ensureFulfillmentForAuction({
          auction,
          bid: highestBidder,
          bidderId: highestBidder.bidder.id,
          sellerId: auctioneer._id,
          winningAmount: highestBidder.amount,
          settlementStatus: settlement.settled ? "WalletCaptured" : "NeedsReview",
        });

        const bidder = await User.findById(highestBidder.bidder.id);
        if (bidder) {
          await User.findByIdAndUpdate(
            bidder._id,
            {
              $inc: {
                moneySpent: Number(highestBidder.amount),
                auctionsWon: 1,
                "buyerStats.completedPurchases": settlement.settled ? 1 : 0,
              },
            },
            { new: true }
          );
          await createNotification({
            user: bidder._id,
            auction: auction._id,
            type: "auction_won",
            title: "You won an auction",
            message: settlement.settled
              ? `You won ${auction.title}. Payment was captured from your wallet.`
              : `You won ${auction.title}. Settlement needs review before shipment.`,
            actionPath: "/won-auctions",
          });
          if (fulfillmentCreated) {
            await createNotification({
              user: bidder._id,
              auction: auction._id,
              type: "fulfillment",
              title: "Delivery address needed",
              message: `Add delivery details for ${auction.title} so the seller can ship your item.`,
              actionPath: "/won-auctions",
            });
          }
        }

        if (settlement.settled) {
          if (settlement.commissionAmount > 0) {
            await Commission.findOneAndUpdate(
              {
                auction: auction._id,
                collectionMethod: "WalletSettlement",
              },
              {
                amount: settlement.commissionAmount,
                user: auctioneer._id,
                auctioneer: auctioneer._id,
                bidder: highestBidder.bidder.id,
                auction: auction._id,
                bid: highestBidder._id,
                platformAccount: settlement.platformAccount?._id,
                platformTransaction: settlement.platformTransaction?._id,
                collectionMethod: "WalletSettlement",
                status: "Collected",
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          }
          await createNotification({
            user: auctioneer._id,
            auction: auction._id,
            type: "wallet",
            title: "Sale proceeds credited",
            message: `${auction.title} proceeds were credited to your wallet after commission.`,
            actionPath: "/seller-dashboard",
          });
          if (fulfillmentCreated) {
            await createNotification({
              user: auctioneer._id,
              auction: auction._id,
              type: "fulfillment",
              title: "Waiting for delivery address",
              message: `${auction.title} has a winner. Shipment will unlock after the buyer adds delivery details.`,
              actionPath: "/seller-dashboard",
            });
          }
        } else {
          await createNotification({
            user: auctioneer._id,
            auction: auction._id,
            type: "wallet",
            title: "Settlement needs review",
            message: `${auction.title} closed, but wallet capture could not be completed automatically. No proof upload is required.`,
            actionPath: "/seller-dashboard",
          });
        }

        if (bidder?.email) {
          const subject = `Congratulations! You won the auction for ${auction.title}`;
          const message = settlement.settled
            ? `Dear ${bidder.userName}, \n\nCongratulations! You have won the auction for ${auction.title}. Your winning amount has been captured from your PrimeBid wallet. \n\nSeller contact email: ${auctioneer.email}\n`
            : `Dear ${bidder.userName}, \n\nCongratulations! You have won the auction for ${auction.title}. PrimeBid could not capture the wallet settlement automatically, so please contact support before making any external payment. \n\nSeller contact email: ${auctioneer.email}\n`;
          await sendEmail({ email: bidder.email, subject, message });
        }
      } else {
        await releaseAuctionBidLocks({
          auction,
          note: "Bid lock released because auction closed without a winner",
        });
        await auction.save();
      }
    } catch (error) {
      console.error(error || "Some error in ended auction cron");
    }
  }

  return {
    endingSoonCount: endingSoonAuctions.length,
    endedCount: endedAuctions.length,
  };
};

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    await runEndedAuctionTasks();
  });
};
