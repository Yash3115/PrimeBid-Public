import express from "express";
import {
    assistAuctionListing,
    bidAdvice,
    suggestAuctionCategory,
    summarizeAuction,
} from "../controllers/aiController.js";
import { isAuth, isAuthorised } from "../middlewares/auth.js";

const router = express.Router();

router.post(
    "/auction-listing-assist",
    isAuth,
    isAuthorised("Auctioneer"),
    assistAuctionListing
);

router.post(
    "/category-suggest",
    isAuth,
    isAuthorised("Auctioneer"),
    suggestAuctionCategory
);

router.post(
    "/auction-summary",
    isAuth,
    summarizeAuction
);

router.post(
    "/bid-advice",
    isAuth,
    isAuthorised("Bidder"),
    bidAdvice
);

export default router;
