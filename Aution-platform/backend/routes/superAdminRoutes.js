import express from 'express';
import { isAuth, isAuthorised } from "../middlewares/auth.js";
import {
    removefromAuction,
    fetchAdminOverview,
    fetchAllusers,
    fetchUsersList,
    updateUserStatus,
    fetchKycSubmissions,
    updateKycStatus,
    fetchAuditLogs,
    monthlyRevenue,
} from '../controllers/superadmincontroller.js';
import {
    fetchWithdrawalRequests,
    reviewWithdrawalRequest,
} from "../controllers/walletController.js";
import {
    fetchFulfillmentDisputes,
    reviewFulfillmentDispute,
} from "../controllers/fulfillmentController.js";
const router = express.Router();

router.delete("/auctionitem/delete/:id",isAuth,isAuthorised("Super Admin"),removefromAuction);

router.get("/overview",isAuth,isAuthorised("Super Admin"),fetchAdminOverview)
router.get("/users/getall",isAuth,isAuthorised("Super Admin"),fetchAllusers)
router.get("/users/list",isAuth,isAuthorised("Super Admin"),fetchUsersList)
router.put("/users/status/:id",isAuth,isAuthorised("Super Admin"),updateUserStatus)
router.get("/kyc/submissions",isAuth,isAuthorised("Super Admin"),fetchKycSubmissions)
router.put("/kyc/:id",isAuth,isAuthorised("Super Admin"),updateKycStatus)
router.get("/audit-logs",isAuth,isAuthorised("Super Admin"),fetchAuditLogs)
router.get("/wallet/withdrawals",isAuth,isAuthorised("Super Admin"),fetchWithdrawalRequests)
router.put("/wallet/withdrawals/:id",isAuth,isAuthorised("Super Admin"),reviewWithdrawalRequest)
router.get("/fulfillment/disputes",isAuth,isAuthorised("Super Admin"),fetchFulfillmentDisputes)
router.put("/fulfillment/disputes/:id",isAuth,isAuthorised("Super Admin"),reviewFulfillmentDispute)

router.get("/monthlyincome", isAuth, isAuthorised("Super Admin"),monthlyRevenue);
export default router;
