import {
    addnewAuction,
    getAllItem,
    getAuctionDetails,
    removefromAuction,
    republishItem,
    getMyAuctionItems,
    updateAuctionItem,
    saveAuctionDraft,
    publishAuctionDraft,
    getSellerDashboard,
    getSmartRecommendations,
    reviewSeller,
    getAuctionSync,
    streamAuctionEvents,
} from "../controllers/auctioncontroller.js";
import {
    respondToFulfillmentIssue,
    updateShipmentStatus,
} from "../controllers/fulfillmentController.js";
import { isAuth, isAuthorised, optionalAuth } from "../middlewares/auth.js";
import { requireAuctioneerKyc } from "../middlewares/kyc.js";
import express from "express";
const router = express.Router();

router.post("/create", isAuth,isAuthorised("Auctioneer"),requireAuctioneerKyc,addnewAuction);
router.post("/draft", isAuth,isAuthorised("Auctioneer"),requireAuctioneerKyc,saveAuctionDraft);
router.get("/allitems",optionalAuth,getAllItem);
router.get("/smart-recommendations",isAuth,getSmartRecommendations);
router.get("/auction/:id/sync",optionalAuth,getAuctionSync);
router.get("/auction/:id/stream",optionalAuth,streamAuctionEvents);
router.get("/auction/:id",optionalAuth,getAuctionDetails);
router.get("/seller-dashboard",isAuth,isAuthorised("Auctioneer"), getSellerDashboard);
router.get("/myitems",isAuth,isAuthorised("Auctioneer"), getMyAuctionItems);
router.put("/update/:id",isAuth,isAuthorised("Auctioneer"),requireAuctioneerKyc,updateAuctionItem);
router.put("/publish/:id",isAuth,isAuthorised("Auctioneer"),requireAuctioneerKyc,publishAuctionDraft);
router.post("/review/:id",isAuth,isAuthorised("Bidder"),reviewSeller);
router.put("/fulfillment/:id/status",isAuth,isAuthorised("Auctioneer"),updateShipmentStatus);
router.put("/fulfillment/:id/issue-response",isAuth,isAuthorised("Auctioneer"),respondToFulfillmentIssue);
router.delete("/delete/:id",isAuth,isAuthorised("Auctioneer"),removefromAuction);
router.put("/item/republish/:id",isAuth,isAuthorised("Auctioneer"),requireAuctioneerKyc,republishItem);
export default router;
