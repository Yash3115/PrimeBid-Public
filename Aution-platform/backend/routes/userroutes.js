import express from 'express';
import {
    addToWatchlist,
    fetchLeaderboard,
    getWatchlist,
    register,
    login,
    googleLogin,
    logout,
    getUserprofile,
    getWonAuctions,
    getNotifications,
    markNotificationsRead,
    removeFromWatchlist,
    submitKyc,
} from '../controllers/userController.js';
import {
    confirmFulfillmentDelivery,
    reportFulfillmentIssue,
    submitDeliveryAddress,
} from "../controllers/fulfillmentController.js";
import { isAuth } from '../middlewares/auth.js';
const router = express.Router();

router.post("/register",register);
router.post("/login",login);
router.post("/google-login",googleLogin);
router.get("/logout",logout);
router.get("/me",isAuth,getUserprofile);
router.get("/leaderboard", fetchLeaderboard);
router.get("/watchlist", isAuth, getWatchlist);
router.post("/watchlist/:id", isAuth, addToWatchlist);
router.delete("/watchlist/:id", isAuth, removeFromWatchlist);
router.get("/won-auctions", isAuth, getWonAuctions);
router.put("/won-auctions/:id/delivery", isAuth, submitDeliveryAddress);
router.put("/won-auctions/:id/confirm-delivery", isAuth, confirmFulfillmentDelivery);
router.post("/won-auctions/:id/issue", isAuth, reportFulfillmentIssue);
router.get("/notifications", isAuth, getNotifications);
router.put("/notifications/read", isAuth, markNotificationsRead);
router.post("/kyc", isAuth, submitKyc);

export default router;
