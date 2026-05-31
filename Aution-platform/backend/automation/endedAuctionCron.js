import cron from "node-cron";
import Auction from "../models/auctionSchema.js";

import User from "../models/userSchema.js";

import Bid from "../models/bidSchema.js";
import Notification from "../models/notificationSchema.js";

import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "../utils/notifications.js";
import { calculateCommission } from "../controllers/commissioncontroller.js";
import {
  SETTLEMENT_STATUS,
  ensureFulfillmentForAuction,
} from "../utils/fulfillment.js";
import { buildEscrowSettlement } from "../utils/escrowSettlement.js";
import {
  captureWinningBidFunds,
  releaseAuctionBidLocks,
} from "../utils/wallet.js";
import { runWithOptionalTransaction } from "../utils/mongoTransaction.js";
import {
  buildAuctionSyncSnapshot,
  bumpAuctionBidVersion,
  publishAuctionEvent,
} from "../utils/auctionRealtime.js";

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
      auction.closedAt = now;
      const highestBidder = await Bid.findOne({
        auctionItem: auction._id,
        amount: Number(auction.currentBid),
      }).sort({ amount: -1 });
      const auctioneer = await User.findById(auction.createdBy);
      if (!auctioneer) {
        bumpAuctionBidVersion(auction, now);
        await auction.save();
        publishAuctionEvent(auction._id, {
          type: "auction_closed",
          snapshot: buildAuctionSyncSnapshot(auction, new Date()),
        });
        continue;
      }
      if (highestBidder) {
        auction.highestBidder = highestBidder.bidder.id;
        let settlement;
        let fulfillmentCreated = false;
        await runWithOptionalTransaction(async ({ session }) => {
          await releaseAuctionBidLocks({
            auction,
            exceptUserId: highestBidder.bidder.id,
            note: "Non-winning bid lock released after auction close",
            session,
          });

          settlement = await captureWinningBidFunds({
            bidderId: highestBidder.bidder.id,
            sellerId: auctioneer._id,
            auctionId: auction._id,
            bidId: highestBidder._id,
            grossAmount: highestBidder.amount,
            commissionAmount,
            session,
          });

          const winningBidEntry = auction.bids.find(
            (bid) =>
              bid.userId?.toString() === highestBidder.bidder.id?.toString()
          );
          if (winningBidEntry && settlement.settled) {
            winningBidEntry.lockedAmount = 0;
          }
          bumpAuctionBidVersion(auction, now);
          await auction.save({ session });

          const fulfillmentResult = await ensureFulfillmentForAuction({
            auction,
            bid: highestBidder,
            bidderId: highestBidder.bidder.id,
            sellerId: auctioneer._id,
            winningAmount: highestBidder.amount,
            settlementStatus: settlement.settled
              ? SETTLEMENT_STATUS.HELD_IN_ESCROW
              : SETTLEMENT_STATUS.NEEDS_REVIEW,
            settlement: settlement.settled
              ? buildEscrowSettlement({
                  grossAmount: settlement.grossAmount,
                  commissionAmount: settlement.commissionAmount,
                })
              : {},
            session,
          });
          fulfillmentCreated = fulfillmentResult.created;
        });

        const bidder = await User.findById(highestBidder.bidder.id);
        if (bidder) {
          await User.findByIdAndUpdate(
            bidder._id,
            {
              $inc: {
                moneySpent: Number(highestBidder.amount),
                auctionsWon: 1,
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
              ? `You won ${auction.title}. Payment is held safely in PrimeBid escrow until delivery is confirmed.`
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
          await createNotification({
            user: auctioneer._id,
            auction: auction._id,
            type: "wallet",
            title: "Sale funds held in escrow",
            message: `${auction.title} funds are held in escrow. Payout unlocks after buyer confirmation or admin review.`,
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
            ? `Dear ${bidder.userName}, \n\nCongratulations! You have won the auction for ${auction.title}. Your winning amount is now held safely in PrimeBid escrow until delivery is confirmed. \n\nSeller contact email: ${auctioneer.email}\n`
            : `Dear ${bidder.userName}, \n\nCongratulations! You have won the auction for ${auction.title}. PrimeBid could not capture the wallet settlement automatically, so please contact support before making any external payment. \n\nSeller contact email: ${auctioneer.email}\n`;
          try {
            await sendEmail({ email: bidder.email, subject, message });
          } catch (emailError) {
            console.error(
              `Winner email failed for auction ${auction._id}:`,
              emailError?.message || emailError
            );
          }
        }
      } else {
        await releaseAuctionBidLocks({
          auction,
          note: "Bid lock released because auction closed without a winner",
        });
        bumpAuctionBidVersion(auction, now);
        await auction.save();
      }
      publishAuctionEvent(auction._id, {
        type: "auction_closed",
        snapshot: buildAuctionSyncSnapshot(auction, new Date()),
      });
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
