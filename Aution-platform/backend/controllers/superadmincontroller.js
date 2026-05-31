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
    buildOperationGroup,
    buildOperationItem,
    summarizeOperationGroups,
} from "../utils/adminOperations.js";
import {
    getOrCreatePlatformAccount,
    getPlatformSnapshot,
} from "../utils/platformAccount.js";
import { buildWalletReconciliation } from "../utils/walletReconciliation.js";
import { SELLER_RISK_LEVEL, buildSellerQualityMap } from "../utils/sellerQuality.js";
import { FULFILLMENT_STATUS, SETTLEMENT_STATUS } from "../utils/fulfillment.js";

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

const warnSellerRisk = asyncErrorHandler(async(req,res,next)=>{
    const { id } = req.params;
    const reason = String(req.body.reason || "Your seller quality metrics need attention. Please resolve fulfillment issues and keep buyers updated.")
        .trim()
        .slice(0, 500);
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid seller ID format");
        err.statusCode = 400;
        return next(err);
    }
    const seller = await User.findOne({ _id: id, role: "Auctioneer" });
    if(!seller){
        const err = new Error("Auctioneer not found");
        err.statusCode = 404;
        return next(err);
    }
    await AuditLog.create({
        actor: req.user._id,
        action: "SELLER_RISK_WARNING_SENT",
        targetType: "User",
        targetId: seller._id,
        summary: `${seller.email} warned for seller quality risk`,
    });
    await createNotification({
        user: seller._id,
        type: "admin",
        title: "Seller quality warning",
        message: reason,
        actionPath: "/seller-dashboard",
    });
    return res.status(200).json({
        success: true,
        message: "Seller warning sent",
    });
});

const requireSellerKycReview = asyncErrorHandler(async(req,res,next)=>{
    const { id } = req.params;
    const reason = String(req.body.reason || "Admin requested a seller KYC re-review because of marketplace risk signals.")
        .trim()
        .slice(0, 500);
    if(!mongoose.Types.ObjectId.isValid(id)){
        const err = new Error("Invalid seller ID format");
        err.statusCode = 400;
        return next(err);
    }
    const seller = await User.findOneAndUpdate(
        { _id: id, role: "Auctioneer" },
        {
            kycStatus: "Pending",
            kycRejectionReason: reason,
            kycSubmittedAt: new Date(),
        },
        { new: true }
    ).select("-password");
    if(!seller){
        const err = new Error("Auctioneer not found");
        err.statusCode = 404;
        return next(err);
    }
    await AuditLog.create({
        actor: req.user._id,
        action: "SELLER_KYC_REVIEW_REQUIRED",
        targetType: "User",
        targetId: seller._id,
        summary: `${seller.email} moved to KYC re-review`,
    });
    await createNotification({
        user: seller._id,
        type: "admin",
        title: "KYC re-review required",
        message: reason,
        actionPath: "/kyc-verification",
    });
    return res.status(200).json({
        success: true,
        message: "Seller moved to KYC re-review",
        seller,
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
        sellerRows,
        sellerQualityFulfillments,
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
        User.find({ role: "Auctioneer" })
            .select("userName email role accountStatus kycStatus reputation createdAt")
            .lean(),
        Fulfillment.find()
            .select("seller status settlementStatus settlement dispute addressSubmittedAt shipping updatedAt")
            .lean(),
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
    const sellerQualityMap = buildSellerQualityMap({
        sellers: sellerRows,
        fulfillments: sellerQualityFulfillments,
        auctions,
        now,
    });
    const allSellerQualityProfiles = [...sellerQualityMap.values()].sort(
        (a, b) => b.riskScore - a.riskScore || b.openDisputes - a.openDisputes
    );
    const sellerQualityProfiles = allSellerQualityProfiles.slice(0, 25);
    const highRiskSellers = allSellerQualityProfiles.filter(
        (seller) => seller.riskLevel === SELLER_RISK_LEVEL.HIGH
    );
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
        highRiskSellers: highRiskSellers.length,
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
            sellerRisk: {
                highRiskCount: highRiskSellers.length,
                mediumRiskCount: allSellerQualityProfiles.filter(
                    (seller) => seller.riskLevel === SELLER_RISK_LEVEL.MEDIUM
                ).length,
                sellers: sellerQualityProfiles,
            },
            actionQueue,
            recentPlatformTransactions,
            recentAuctions,
        },
    });
});

const fetchAdminOperations = asyncErrorHandler(async(req,res,next)=>{
    const now = new Date();
    const requestedLimit = Number(req.query.limit || 6);
    const limit = Math.min(
        Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 6, 1),
        12
    );
    const addressWarningDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const shipmentWarningDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
        pendingKyc,
        pendingWithdrawals,
        openDisputes,
        settlementReviews,
        stalledFulfillments,
        auctionCandidates,
        sellerRows,
        sellerFulfillments,
        sellerAuctions,
    ] = await Promise.all([
        User.find({ role: "Auctioneer", kycStatus: "Pending" })
            .select("userName email kycStatus kycSubmittedAt createdAt")
            .sort({ kycSubmittedAt: 1, createdAt: 1 })
            .limit(limit)
            .lean(),
        WithdrawalRequest.find({ status: "Pending" })
            .populate("user", "userName email role wallet kycStatus")
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean(),
        Fulfillment.find({ "dispute.isOpen": true })
            .populate("auction", "title currentBid image")
            .populate("bidder", "userName email")
            .populate("seller", "userName email")
            .sort({ "dispute.reportedAt": 1, updatedAt: 1 })
            .limit(limit)
            .lean(),
        Fulfillment.find({
            settlementStatus: {
                $in: [
                    SETTLEMENT_STATUS.NEEDS_REVIEW,
                    SETTLEMENT_STATUS.READY_TO_RELEASE,
                ],
            },
            "dispute.isOpen": { $ne: true },
        })
            .populate("auction", "title currentBid image")
            .populate("bidder", "userName email")
            .populate("seller", "userName email")
            .sort({ updatedAt: 1 })
            .limit(limit)
            .lean(),
        Fulfillment.find({
            $or: [
                {
                    status: FULFILLMENT_STATUS.AWAITING_ADDRESS,
                    createdAt: { $lte: addressWarningDate },
                },
                {
                    status: FULFILLMENT_STATUS.READY_TO_SHIP,
                    addressSubmittedAt: { $lte: shipmentWarningDate },
                },
            ],
        })
            .populate("auction", "title currentBid image")
            .populate("bidder", "userName email")
            .populate("seller", "userName email")
            .sort({ updatedAt: 1 })
            .limit(limit)
            .lean(),
        Auction.find({ status: { $ne: "Draft" } })
            .select("title currentBid startingBid bids status startTime endTime createdBy updatedAt")
            .populate("createdBy", "userName email")
            .sort({ endTime: 1 })
            .limit(250)
            .lean(),
        User.find({ role: "Auctioneer" })
            .select("userName email role accountStatus kycStatus reputation createdAt")
            .lean(),
        Fulfillment.find()
            .select("seller status settlementStatus settlement dispute addressSubmittedAt shipping updatedAt")
            .lean(),
        Auction.find()
            .select("createdBy status startTime endTime")
            .lean(),
    ]);

    const sellerQualityMap = buildSellerQualityMap({
        sellers: sellerRows,
        fulfillments: sellerFulfillments,
        auctions: sellerAuctions,
        now,
    });
    const riskySellers = [...sellerQualityMap.values()]
        .filter((seller) => seller.riskLevel !== SELLER_RISK_LEVEL.LOW)
        .sort((a, b) => b.riskScore - a.riskScore || b.openDisputes - a.openDisputes)
        .slice(0, limit);
    const auctionRisks = auctionCandidates
        .map((auction) => ({
            auction,
            timing: getAuctionTiming(auction, now),
        }))
        .filter(({ auction, timing }) => {
            const hasNoBids = (auction.bids || []).length === 0;
            return (
                timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID ||
                (hasNoBids &&
                    [
                        AUCTION_RUNTIME_STATUS.UPCOMING,
                        AUCTION_RUNTIME_STATUS.LIVE,
                    ].includes(timing.runtimeStatus))
            );
        })
        .slice(0, limit);

    const groups = [
        buildOperationGroup({
            id: "kyc",
            label: "KYC Review",
            detail: "Auctioneers waiting for listing approval.",
            href: "#kyc",
            priority: "high",
            emptyLabel: "No pending KYC submissions.",
            items: pendingKyc.map((user) =>
                buildOperationItem({
                    id: user._id,
                    title: user.userName,
                    detail: user.email,
                    status: user.kycStatus,
                    createdAt: user.kycSubmittedAt || user.createdAt,
                    href: "#kyc",
                    actionLabel: "Review KYC",
                    priority: "high",
                    now,
                    sla: { warningHours: 24, criticalHours: 72 },
                })
            ),
        }),
        buildOperationGroup({
            id: "withdrawals",
            label: "Withdrawal Review",
            detail: "Manual payout requests waiting for approval.",
            href: "#withdrawals",
            priority: "critical",
            emptyLabel: "No pending withdrawals.",
            items: pendingWithdrawals.map((withdrawal) =>
                buildOperationItem({
                    id: withdrawal._id,
                    title: withdrawal.user?.userName || "Wallet user",
                    detail: withdrawal.user?.email || "No email",
                    status: withdrawal.status,
                    amount: withdrawal.amount,
                    createdAt: withdrawal.createdAt,
                    href: "#withdrawals",
                    actionLabel: "Review payout",
                    priority: "critical",
                    now,
                    sla: { warningHours: 12, criticalHours: 48 },
                    meta: {
                        bankName: withdrawal.bankDetailsSnapshot?.bankName || "",
                        kycStatus: withdrawal.user?.kycStatus || "",
                    },
                })
            ),
        }),
        buildOperationGroup({
            id: "disputes",
            label: "Delivery Disputes",
            detail: "Buyer issues that may block escrow release.",
            href: "#disputes",
            priority: "critical",
            emptyLabel: "No open delivery disputes.",
            items: openDisputes.map((fulfillment) =>
                buildOperationItem({
                    id: fulfillment._id,
                    title: fulfillment.auction?.title || "Auction fulfillment",
                    detail: `${fulfillment.bidder?.userName || "Buyer"} vs ${fulfillment.seller?.userName || "Seller"}`,
                    status: fulfillment.dispute?.status || "Open",
                    amount: fulfillment.settlement?.escrowAmount || fulfillment.winningAmount,
                    createdAt: fulfillment.dispute?.reportedAt || fulfillment.updatedAt,
                    href: "#disputes",
                    actionLabel: "Resolve dispute",
                    priority: "critical",
                    now,
                    sla: { warningHours: 12, criticalHours: 48 },
                    meta: {
                        issueType: fulfillment.dispute?.issueType || "",
                        settlementStatus: fulfillment.settlementStatus,
                    },
                })
            ),
        }),
        buildOperationGroup({
            id: "settlement",
            label: "Escrow Settlement",
            detail: "Captured funds waiting for admin or buyer confirmation.",
            href: "#disputes",
            priority: "high",
            emptyLabel: "No settlement reviews pending.",
            items: settlementReviews.map((fulfillment) =>
                buildOperationItem({
                    id: fulfillment._id,
                    title: fulfillment.auction?.title || "Escrow item",
                    detail: `${fulfillment.seller?.userName || "Seller"} payout`,
                    status: fulfillment.settlementStatus,
                    amount: fulfillment.settlement?.escrowAmount || fulfillment.winningAmount,
                    createdAt: fulfillment.updatedAt,
                    href: "#disputes",
                    actionLabel: "Review escrow",
                    priority:
                        fulfillment.settlementStatus === SETTLEMENT_STATUS.NEEDS_REVIEW
                            ? "critical"
                            : "high",
                    now,
                    sla: { warningHours: 48, criticalHours: 96 },
                })
            ),
        }),
        buildOperationGroup({
            id: "fulfillment",
            label: "Fulfillment Follow-Up",
            detail: "Orders stuck before shipment or buyer address submission.",
            href: "#operations",
            priority: "medium",
            emptyLabel: "No stalled fulfillment work.",
            items: stalledFulfillments.map((fulfillment) =>
                buildOperationItem({
                    id: fulfillment._id,
                    title: fulfillment.auction?.title || "Order handoff",
                    detail:
                        fulfillment.status === FULFILLMENT_STATUS.AWAITING_ADDRESS
                            ? `${fulfillment.bidder?.userName || "Buyer"} needs address`
                            : `${fulfillment.seller?.userName || "Seller"} needs to ship`,
                    status: fulfillment.status,
                    amount: fulfillment.winningAmount,
                    createdAt:
                        fulfillment.status === FULFILLMENT_STATUS.READY_TO_SHIP
                            ? fulfillment.addressSubmittedAt || fulfillment.updatedAt
                            : fulfillment.createdAt,
                    href: "#operations",
                    actionLabel: "Follow up",
                    priority: "medium",
                    now,
                    sla: { warningHours: 48, criticalHours: 120 },
                })
            ),
        }),
        buildOperationGroup({
            id: "seller-risk",
            label: "Seller Risk",
            detail: "Auctioneers with dispute, refund, or service risk signals.",
            href: "#seller-risk",
            priority: "critical",
            emptyLabel: "No elevated seller risk.",
            items: riskySellers.map((seller) =>
                buildOperationItem({
                    id: seller.sellerId,
                    title: seller.userName,
                    detail: seller.email,
                    status: `${seller.riskLevel} risk`,
                    createdAt: now,
                    href: "#seller-risk",
                    actionLabel: "Review seller",
                    priority:
                        seller.riskLevel === SELLER_RISK_LEVEL.HIGH
                            ? "critical"
                            : "high",
                    now,
                    meta: {
                        riskScore: seller.riskScore,
                        openDisputes: seller.openDisputes,
                        reasons: seller.reasons,
                    },
                })
            ),
        }),
        buildOperationGroup({
            id: "auction-risk",
            label: "Auction Health",
            detail: "Listings with invalid dates or no bid traction.",
            href: "#auction-moderation",
            priority: "low",
            emptyLabel: "No auction health issues.",
            items: auctionRisks.map(({ auction, timing }) =>
                buildOperationItem({
                    id: auction._id,
                    title: auction.title,
                    detail: auction.createdBy?.userName || auction.createdBy?.email || "Auctioneer",
                    status:
                        timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID
                            ? "Invalid schedule"
                            : "No bids yet",
                    amount: auction.currentBid || auction.startingBid,
                    createdAt: auction.updatedAt || auction.startTime,
                    href: "#auction-moderation",
                    actionLabel: "Review auction",
                    priority:
                        timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID
                            ? "high"
                            : "low",
                    now,
                    meta: {
                        runtimeStatus: timing.runtimeStatus,
                        endTime: auction.endTime,
                    },
                })
            ),
        }),
    ];

    return res.status(200).json({
        success: true,
        operations: {
            generatedAt: now.toISOString(),
            summary: summarizeOperationGroups(groups),
            groups,
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
    fetchAdminOperations,
    fetchAllusers,
    fetchUsersList,
    updateUserStatus,
    warnSellerRisk,
    requireSellerKycReview,
    fetchKycSubmissions,
    updateKycStatus,
    fetchAuditLogs,
    monthlyRevenue,
};
