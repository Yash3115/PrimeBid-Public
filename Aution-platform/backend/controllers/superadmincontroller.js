import mongoose from "mongoose";
import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import Auction from "../models/auctionSchema.js";
import User from "../models/userSchema.js";
import Commission from "../models/commissionSchema.js";
import Bid from "../models/bidSchema.js";
import AuditLog from "../models/auditLogSchema.js";
import Fulfillment from "../models/fulfillmentSchema.js";
import PlatformTransaction from "../models/platformTransactionSchema.js";
import WithdrawalRequest from "../models/withdrawalRequestSchema.js";
import { createNotification } from "../utils/notifications.js";
import {
    AUCTION_RUNTIME_STATUS,
    getAuctionTiming,
} from "../utils/auctionStatus.js";
import {
    buildAdminActionQueue,
    buildAuctionRuntimeSummary,
    buildWalletTotals,
    countRowsById,
    sumRowsById,
} from "../utils/adminDashboard.js";
import {
    getOrCreatePlatformAccount,
    getPlatformSnapshot,
} from "../utils/platformAccount.js";
import { buildWalletReconciliation } from "../utils/walletReconciliation.js";

const escapeRegex = (value) =>
    String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removefromAuction = asyncErrorHandler(async(req,res,next)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid ID Format");
        err.statusCode = 400;
        return next(err);
    }
    const AuctionItem = await Auction.findById(id);
    if(!AuctionItem){
        const err = new Error("Auction not found");
        err.statusCode = 404;
        return next(err);
    }
    await Bid.deleteMany({ auctionItem: AuctionItem._id });
    await AuctionItem.deleteOne();
    await AuditLog.create({
        actor: req.user._id,
        action: "AUCTION_DELETED",
        targetType: "Auction",
        targetId: AuctionItem._id,
        summary: AuctionItem.title,
    });
    return res.status(200).json({
        success: true,
        message: "Auction item removed successfully",
    })
})

const fetchAllusers =asyncErrorHandler(async(req,res,next)=>{
    const users = await User.aggregate([
        {
            $group:{
                _id:{
                    month:{$month:"$createdAt"},
                    year:{$year:"$createdAt"},
                    role:"$role"
                },
                count: {$sum:1}
            }
        },
        {
            $project:{
                month:"$_id.month",
                year:"$_id.year",
                role:"$_id.role",
                count:1,
                _id: 0
            }
        },
        {
            $sort:{year:1,month:1}
        }
    ]);
    const biddersarray = users.filter(user=> user.role==="Bidder")
    const auctioneersarray = users.filter(user=>user.role==="Auctioneer");

    const transformdayintomonth = (data,totalmonth=12)=>{
        const result = Array(totalmonth).fill(0);

        data.map(item=>{
            result[item.month-1]=item.count
        })
        return result;
    }

    const biddersCount = transformdayintomonth(biddersarray);
    const auctioneersCount = transformdayintomonth(auctioneersarray);

    return res.status(200).json({
        success: true,
        biddersCount,
        auctioneersCount,
        biddersArray: biddersCount,
        auctioneersArray: auctioneersCount
    })
 
})

const fetchUsersList = asyncErrorHandler(async(req,res,next)=>{
    const { role, status, search } = req.query;
    const query = {};
    if(role && ["Auctioneer", "Bidder", "Super Admin"].includes(role)){
        query.role = role;
    }
    if(status && ["Active", "Paused"].includes(status)){
        query.accountStatus = status;
    }
    if(search){
        const safeSearch = escapeRegex(search).slice(0, 80);
        query.$or = [
            { userName: { $regex: safeSearch, $options: "i" } },
            { email: { $regex: safeSearch, $options: "i" } },
        ];
    }
    const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(200);
    return res.status(200).json({
        success: true,
        users,
    });
});

const updateUserStatus = asyncErrorHandler(async(req,res,next)=>{
    const { id } = req.params;
    const { accountStatus } = req.body;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid user ID format");
        err.statusCode = 400;
        return next(err);
    }
    if(!["Active", "Paused"].includes(accountStatus)){
        const err = new Error("Invalid account status");
        err.statusCode = 400;
        return next(err);
    }
    if(id === req.user._id.toString() && accountStatus === "Paused"){
        const err = new Error("You cannot pause your own super admin account");
        err.statusCode = 400;
        return next(err);
    }
    const user = await User.findByIdAndUpdate(
        id,
        { accountStatus },
        { new: true }
    ).select("-password");
    if(!user){
        const err = new Error("User not found");
        err.statusCode = 404;
        return next(err);
    }
    await AuditLog.create({
        actor: req.user._id,
        action: "USER_STATUS_UPDATED",
        targetType: "User",
        targetId: user._id,
        summary: `${user.email} set to ${accountStatus}`,
    });
    await createNotification({
        user: user._id,
        type: "admin",
        title: "Account status updated",
        message: `Your account status is now ${accountStatus}.`,
    });
    return res.status(200).json({
        success: true,
        message: "User status updated",
        user,
    });
});

const fetchKycSubmissions = asyncErrorHandler(async(req,res,next)=>{
    const { status = "Pending" } = req.query;
    const query = { role: "Auctioneer" };
    if(["Not Submitted", "Pending", "Approved", "Rejected"].includes(status)){
        query.kycStatus = status;
    }
    const users = await User.find(query)
        .select(
            "-password +kycDocuments.idProof.public_id +kycDocuments.idProof.url +kycDocuments.selfie.public_id +kycDocuments.selfie.url +kycDocuments.addressProof.public_id +kycDocuments.addressProof.url"
        )
        .sort({ kycSubmittedAt: -1, createdAt: -1 })
        .limit(200);

    return res.status(200).json({
        success: true,
        users,
    });
});

const updateKycStatus = asyncErrorHandler(async(req,res,next)=>{
    const { id } = req.params;
    const { status, rejectionReason = "" } = req.body;
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid user ID format");
        err.statusCode = 400;
        return next(err);
    }
    if(!["Approved", "Rejected"].includes(status)){
        const err = new Error("KYC status must be Approved or Rejected");
        err.statusCode = 400;
        return next(err);
    }
    if(status === "Rejected" && !String(rejectionReason).trim()){
        const err = new Error("Rejection reason is required when rejecting KYC");
        err.statusCode = 400;
        return next(err);
    }

    const user = await User.findOneAndUpdate(
        { _id: id, role: "Auctioneer" },
        {
            kycStatus: status,
            kycRejectionReason: status === "Rejected" ? String(rejectionReason).trim().slice(0, 500) : "",
            kycReviewedAt: new Date(),
            kycReviewedBy: req.user._id,
        },
        { new: true }
    ).select("-password");

    if(!user){
        const err = new Error("Auctioneer not found");
        err.statusCode = 404;
        return next(err);
    }

    await AuditLog.create({
        actor: req.user._id,
        action: "KYC_STATUS_UPDATED",
        targetType: "User",
        targetId: user._id,
        summary: `${user.email} KYC ${status}`,
    });
    await createNotification({
        user: user._id,
        type: "admin",
        title: `KYC ${status}`,
        message: status === "Approved"
            ? "Your auctioneer KYC has been approved. You can now list auctions."
            : `Your auctioneer KYC was rejected: ${user.kycRejectionReason}`,
    });

    return res.status(200).json({
        success: true,
        message: `KYC ${status.toLowerCase()}`,
        user,
    });
});

const fetchAuditLogs = asyncErrorHandler(async(req,res,next)=>{
    const logs = await AuditLog.find()
        .populate("actor", "userName email role")
        .sort({ createdAt: -1 })
        .limit(80);
    return res.status(200).json({
        success: true,
        logs,
    });
});

const fetchAdminOverview = asyncErrorHandler(async(req,res,next)=>{
    const now = new Date();
    const [
        usersByRoleRows,
        usersByStatusRows,
        kycRows,
        walletRows,
        auctions,
        totalBids,
        withdrawalAmountRows,
        fulfillmentRows,
        fulfillmentSettlementRows,
        openDisputeCount,
        platformAccount,
        bidLockRows,
        platformTransactionAmountRows,
        recentPlatformTransactions,
        recentAuctions,
    ] = await Promise.all([
        User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } },
        ]),
        User.aggregate([
            { $group: { _id: "$accountStatus", count: { $sum: 1 } } },
        ]),
        User.aggregate([
            { $match: { role: "Auctioneer" } },
            { $group: { _id: "$kycStatus", count: { $sum: 1 } } },
        ]),
        User.aggregate([
            {
                $group: {
                    _id: null,
                    availableBalance: { $sum: "$wallet.availableBalance" },
                    lockedBalance: { $sum: "$wallet.lockedBalance" },
                    lifetimeDeposited: { $sum: "$wallet.lifetimeDeposited" },
                    lifetimeWithdrawn: { $sum: "$wallet.lifetimeWithdrawn" },
                },
            },
        ]),
        Auction.find()
            .select("title startTime endTime status currentBid startingBid bids createdBy updatedAt")
            .lean(),
        Bid.countDocuments(),
        WithdrawalRequest.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    amount: { $sum: "$amount" },
                },
            },
        ]),
        Fulfillment.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Fulfillment.aggregate([
            {
                $group: {
                    _id: "$settlementStatus",
                    count: { $sum: 1 },
                    amount: { $sum: "$settlement.escrowAmount" },
                },
            },
        ]),
        Fulfillment.countDocuments({ "dispute.isOpen": true }),
        getOrCreatePlatformAccount(),
        Bid.aggregate([
            { $match: { lockedAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: "$lockedAmount" },
                },
            },
        ]),
        PlatformTransaction.aggregate([
            { $match: { status: "Completed" } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    amount: { $sum: "$amount" },
                },
            },
        ]),
        PlatformTransaction.find().sort({ createdAt: -1 }).limit(5).lean(),
        Auction.find()
            .select("title image currentBid status startTime endTime createdBy updatedAt")
            .populate("createdBy", "userName email")
            .sort({ updatedAt: -1 })
            .limit(6)
            .lean(),
    ]);

    const usersByRole = countRowsById(usersByRoleRows);
    const usersByStatus = countRowsById(usersByStatusRows);
    const kyc = countRowsById(kycRows);
    const withdrawalsByStatus = sumRowsById(withdrawalAmountRows);
    const fulfillment = countRowsById(fulfillmentRows);
    const fulfillmentSettlement = sumRowsById(fulfillmentSettlementRows);
    const platformLedger = sumRowsById(platformTransactionAmountRows);
    const walletTotals = buildWalletTotals(walletRows);
    const platformSnapshot = getPlatformSnapshot(platformAccount);
    const activeEscrowTotal =
        Number(fulfillmentSettlement.HeldInEscrow?.amount || 0) +
        Number(fulfillmentSettlement.ReadyToRelease?.amount || 0) +
        Number(fulfillmentSettlement.UnderDispute?.amount || 0);
    const platformCommissionLedger =
        Number(platformLedger.COMMISSION_CREDIT?.amount || 0) +
        Number(platformLedger.MANUAL_COMMISSION_CREDIT?.amount || 0);
    const platformLedgerBalance =
        platformCommissionLedger -
        Number(platformLedger.PLATFORM_WITHDRAWAL?.amount || 0);
    const reconciliation = buildWalletReconciliation({
        walletTotals,
        bidLockTotal: bidLockRows[0]?.amount || 0,
        pendingWithdrawalTotal: withdrawalsByStatus.Pending?.amount || 0,
        activeEscrowTotal,
        platformSnapshot,
        platformLedgerBalance,
        platformCommissionLedger,
    });
    const auctionRuntime = buildAuctionRuntimeSummary(auctions, now);
    const activeNoBidAuctions = auctions.filter((auction) => {
        if (auction.status === "Draft" || (auction.bids || []).length > 0) {
            return false;
        }
        const runtimeStatus = getAuctionTiming(auction, now).runtimeStatus;
        return [
            AUCTION_RUNTIME_STATUS.UPCOMING,
            AUCTION_RUNTIME_STATUS.LIVE,
        ].includes(runtimeStatus);
    }).length;
    const actionQueue = buildAdminActionQueue({
        pendingKyc: kyc.Pending,
        pendingWithdrawals: withdrawalsByStatus.Pending?.count,
        awaitingAddress: fulfillment.AwaitingAddress,
        readyToShip: fulfillment.ReadyToShip,
        issueReported: openDisputeCount || fulfillment.IssueReported,
        atRiskAuctions: activeNoBidAuctions,
        reconciliationWarnings: reconciliation.warnings.length,
    });

    return res.status(200).json({
        success: true,
        overview: {
            generatedAt: now.toISOString(),
            users: {
                total: Object.values(usersByRole).reduce((total, count) => total + count, 0),
                byRole: usersByRole,
                byStatus: usersByStatus,
            },
            auctions: {
                ...auctionRuntime,
                totalBids,
                activeNoBidAuctions,
            },
            kyc,
            wallet: walletTotals,
            withdrawals: {
                byStatus: withdrawalsByStatus,
            },
            fulfillment,
            fulfillmentSettlement,
            disputes: {
                open: openDisputeCount,
            },
            platform: platformSnapshot,
            reconciliation,
            actionQueue,
            recentPlatformTransactions,
            recentAuctions,
        },
    });
});

const monthlyRevenue = asyncErrorHandler(async(req,res,next)=>{
    const payments = await Commission.aggregate([
        {
            $group:{
                _id:{
                    month:{$month:"$createdAt"},
                    year:{$year:"$createdAt"}
                },
                totalRevenue: {$sum:"$amount"}
            },
            
        },
        {
            $sort:{
                month:1,
                year:1
            }
        }
    ]);

    const transformdayintomonthrevenue = (payments,totalmonth=12)=>{
        const result = Array(totalmonth).fill(0);

        payments.map(item=>{
            result[item._id.month-1]=item.totalRevenue
        })
        return result;
    }

    const revenue = transformdayintomonthrevenue(payments);
    const platformAccount = await getOrCreatePlatformAccount();
    const platformTransactions = await PlatformTransaction.find()
        .sort({ createdAt: -1 })
        .limit(10);
    return res.status(200).json({
        success: true,
        revenue,
        totalMonthlyRevenue: revenue,
        platformAccount: getPlatformSnapshot(platformAccount),
        platformTransactions,
    })
})

export {
    removefromAuction,
    fetchAdminOverview,
    fetchAllusers,
    fetchUsersList,
    updateUserStatus,
    fetchKycSubmissions,
    updateKycStatus,
    fetchAuditLogs,
    monthlyRevenue,
};
