import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { addnewAuction } from "../controllers/auctioncontroller.js";
import Auction from "../models/auctionSchema.js";

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const runController = (controller, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
      },
    };
    controller(req, res, (error) => {
      if (error) reject(error);
    });
  });

test("auctioneers can create multiple active or upcoming auctions", async () => {
  const originalFind = Auction.find;
  const originalSave = Auction.prototype.save;
  Auction.find = async () => {
    throw new Error("auction creation should not query existing active auctions");
  };
  Auction.prototype.save = async function saveAuctionWithoutDatabase() {
    return this;
  };

  try {
    const now = Date.now();
    const response = await runController(addnewAuction, {
      user: { _id: new mongoose.Types.ObjectId() },
      files: {
        image: {
          name: "demo.png",
          mimetype: "image/png",
          size: pngBytes.length,
          data: pngBytes,
        },
      },
      body: {
        title: "Concurrent Auction",
        description: "Auctioneers should be able to run multiple listings at once.",
        startTime: new Date(now + 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        startingBid: "1000",
        category: "Electronics",
        condition: "Used",
        minimumBidIncrement: "100",
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.payload.success, true);
    assert.equal(response.payload.newAuction.title, "Concurrent Auction");
  } finally {
    Auction.find = originalFind;
    Auction.prototype.save = originalSave;
  }
});
