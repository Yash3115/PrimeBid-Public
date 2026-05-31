import asyncErrorHandler from "./asyncErrorHandler.js";
import { acquireAuctionRequestLock } from "../utils/auctionRequestLocks.js";

export const lockAuctionMutation = asyncErrorHandler(async (req, res, next) => {
  const release = await acquireAuctionRequestLock(req.params.id);
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    release();
  };

  res.once("finish", releaseOnce);
  res.once("close", releaseOnce);
  next();
});
