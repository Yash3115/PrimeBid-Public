import express from "express";
import { isAuth, isAuthorised } from "../middlewares/auth.js";
import {
    getWallet,
    getMyWithdrawals,
    requestWithdrawal,
    topUpWallet,
} from "../controllers/walletController.js";

const router = express.Router();

router.get("/", isAuth, getWallet);
router.post("/top-up", isAuth, isAuthorised("Bidder"), topUpWallet);
router.get("/withdrawals", isAuth, getMyWithdrawals);
router.post(
    "/withdrawals",
    isAuth,
    isAuthorised("Auctioneer", "Bidder"),
    requestWithdrawal
);

export default router;
