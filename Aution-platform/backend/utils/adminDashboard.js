import {
    AUCTION_RUNTIME_STATUS,
    getAuctionTiming,
} from "./auctionStatus.js";

const toNumber = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
};

export const countRowsById = (rows = []) =>
    rows.reduce((counts, row) => {
        const key = row?._id || "Unknown";
        counts[key] = toNumber(row?.count);
        return counts;
    }, {});

export const sumRowsById = (rows = []) =>
    rows.reduce((totals, row) => {
        const key = row?._id || "Unknown";
        totals[key] = {
            count: toNumber(row?.count),
            amount: toNumber(row?.amount),
        };
        return totals;
    }, {});

export const buildAuctionRuntimeSummary = (auctions = [], now = new Date()) => {
    const summary = {
        total: auctions.length,
        draft: 0,
        upcoming: 0,
        live: 0,
        ended: 0,
        invalid: 0,
        published: 0,
    };

    for (const auction of auctions) {
        if (auction?.status === "Draft") {
            summary.draft += 1;
            continue;
        }

        summary.published += 1;
        const timing = getAuctionTiming(auction, now);
        if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.UPCOMING) {
            summary.upcoming += 1;
        } else if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.LIVE) {
            summary.live += 1;
        } else if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED) {
            summary.ended += 1;
        } else {
            summary.invalid += 1;
        }
    }

    return summary;
};

export const buildAdminActionQueue = ({
    pendingKyc = 0,
    pendingWithdrawals = 0,
    awaitingAddress = 0,
    readyToShip = 0,
    issueReported = 0,
    atRiskAuctions = 0,
    reconciliationWarnings = 0,
} = {}) => {
    const queue = [
        {
            id: "wallet-reconciliation",
            label: "Wallet mismatches",
            count: toNumber(reconciliationWarnings),
            detail: "Recorded balances differ from ledger expectations",
            href: "#operations",
            priority: "critical",
        },
        {
            id: "withdrawals",
            label: "Withdrawal reviews",
            count: toNumber(pendingWithdrawals),
            detail: "Manual payout requests need admin approval",
            href: "#withdrawals",
            priority: "critical",
        },
        {
            id: "kyc",
            label: "KYC approvals",
            count: toNumber(pendingKyc),
            detail: "Auctioneers waiting to list products",
            href: "#kyc",
            priority: "high",
        },
        {
            id: "fulfillment-issues",
            label: "Delivery issues",
            count: toNumber(issueReported),
            detail: "Orders where buyer or seller reported a problem",
            href: "#disputes",
            priority: "critical",
        },
        {
            id: "ready-to-ship",
            label: "Ready to ship",
            count: toNumber(readyToShip),
            detail: "Sellers need to dispatch won auctions",
            href: "#operations",
            priority: "medium",
        },
        {
            id: "awaiting-address",
            label: "Awaiting buyer address",
            count: toNumber(awaitingAddress),
            detail: "Winners must add delivery details",
            href: "#operations",
            priority: "medium",
        },
        {
            id: "auction-risk",
            label: "No-bid active auctions",
            count: toNumber(atRiskAuctions),
            detail: "Live or upcoming listings without bids",
            href: "#auction-moderation",
            priority: "low",
        },
    ];

    return queue.filter((item) => item.count > 0);
};

export const buildWalletTotals = (walletRows = []) => {
    const totals = walletRows[0] || {};
    return {
        availableBalance: toNumber(totals.availableBalance),
        lockedBalance: toNumber(totals.lockedBalance),
        lifetimeDeposited: toNumber(totals.lifetimeDeposited),
        lifetimeWithdrawn: toNumber(totals.lifetimeWithdrawn),
    };
};
