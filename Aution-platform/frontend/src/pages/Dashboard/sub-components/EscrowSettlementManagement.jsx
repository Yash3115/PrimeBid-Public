/* eslint-disable react/prop-types */
import {
  SETTLEMENT_ACTION,
  SETTLEMENT_STATUS,
  canAdminSettleEscrow,
  getFulfillmentLabel,
  getFulfillmentTone,
  getSettlementLabel,
  getSettlementTone,
  hasOpenDispute,
} from "@/lib/fulfillment";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getFulfillmentSettlements,
  reviewFulfillmentSettlement,
} from "@/store/slices/superAdminSlice";
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const statusFilters = [
  { value: "Review", label: "Needs review" },
  { value: "Active", label: "Active escrow" },
  { value: "Finalized", label: "Finalized" },
  { value: "All", label: "All settlements" },
  { value: SETTLEMENT_STATUS.HELD_IN_ESCROW, label: "Held in escrow" },
  { value: SETTLEMENT_STATUS.READY_TO_RELEASE, label: "Ready to release" },
  { value: SETTLEMENT_STATUS.UNDER_DISPUTE, label: "Blocked by dispute" },
  { value: SETTLEMENT_STATUS.NEEDS_REVIEW, label: "Capture review" },
];

const finalizedStatuses = [
  SETTLEMENT_STATUS.RELEASED_TO_SELLER,
  SETTLEMENT_STATUS.REFUNDED_TO_BUYER,
];

const EscrowSettlementManagement = () => {
  const dispatch = useDispatch();
  const { fulfillmentSettlements } = useSelector((state) => state.superAdmin);
  const [statusFilter, setStatusFilter] = useState("Review");
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    dispatch(getFulfillmentSettlements(statusFilter));
  }, [dispatch, statusFilter]);

  const updateReviewNote = (id, adminResolution) => {
    setReviews((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        adminResolution,
      },
    }));
  };

  const handleSettlementReview = async (fulfillmentId, settlementAction) => {
    const adminResolution = (reviews[fulfillmentId]?.adminResolution || "").trim();
    if (adminResolution.length < 10) return;

    const response = await dispatch(
      reviewFulfillmentSettlement(
        fulfillmentId,
        { settlementAction, adminResolution },
        statusFilter
      )
    );

    if (response?.success) {
      setReviews((current) => {
        const next = { ...current };
        delete next[fulfillmentId];
        return next;
      });
    }
  };

  const totalEscrow = fulfillmentSettlements.reduce(
    (total, fulfillment) =>
      total + Number(fulfillment?.settlement?.escrowAmount || 0),
    0
  );
  const actionableCount = fulfillmentSettlements.filter(canAdminSettleEscrow).length;
  const blockedCount = fulfillmentSettlements.filter(
    (fulfillment) =>
      hasOpenDispute(fulfillment) ||
      fulfillment.settlementStatus === SETTLEMENT_STATUS.NEEDS_REVIEW
  ).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SettlementSummaryCard
          label="Visible settlements"
          value={fulfillmentSettlements.length}
          detail="Current filter"
          icon={PackageCheck}
        />
        <SettlementSummaryCard
          label="Escrow amount"
          value={formatCurrency(totalEscrow)}
          detail="Captured escrow in view"
          icon={Wallet}
        />
        <SettlementSummaryCard
          label="Actionable now"
          value={actionableCount}
          detail={`${blockedCount} blocked or capture-review items`}
          icon={ShieldCheck}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-600">
          Review captured auction funds, release seller proceeds, or refund the buyer
          when delivery and dispute evidence supports the decision.
        </p>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-52"
        >
          {statusFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {fulfillmentSettlements.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          No escrow settlements found for this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {fulfillmentSettlements.map((fulfillment) => (
            <SettlementCard
              key={fulfillment._id}
              fulfillment={fulfillment}
              review={reviews[fulfillment._id] || {}}
              onNoteChange={updateReviewNote}
              onReview={handleSettlementReview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SettlementCard = ({ fulfillment, review, onNoteChange, onReview }) => {
  const auction = fulfillment.auction || {};
  const bidder = fulfillment.bidder || {};
  const seller = fulfillment.seller || {};
  const settlement = fulfillment.settlement || {};
  const winningAmount = Number(fulfillment.winningAmount || auction.currentBid || 0);
  const escrowAmount = Number(settlement.escrowAmount || 0);
  const commissionAmount = Number(settlement.commissionAmount || 0);
  const sellerPayoutAmount = Number(
    settlement.sellerPayoutAmount || Math.max(escrowAmount - commissionAmount, 0)
  );
  const canReview = canAdminSettleEscrow(fulfillment);
  const note = review.adminResolution || "";
  const noteReady = note.trim().length >= 10;
  const isFinalized = finalizedStatuses.includes(fulfillment.settlementStatus);
  const openDispute = hasOpenDispute(fulfillment);
  const needsCaptureReview =
    fulfillment.settlementStatus === SETTLEMENT_STATUS.NEEDS_REVIEW;
  const recentTimeline = (fulfillment.timeline || []).slice(-3).reverse();

  return (
    <article className="grid gap-4 rounded-md border border-slate-200 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-950">
              {auction.title || "Auction item"}
            </h3>
            <span
              className={`rounded-md px-3 py-1 text-xs font-bold ${getSettlementTone(
                fulfillment.settlementStatus
              )}`}
            >
              {getSettlementLabel(fulfillment.settlementStatus)}
            </span>
            <span
              className={`rounded-md px-3 py-1 text-xs font-bold ${getFulfillmentTone(
                fulfillment.status
              )}`}
            >
              {getFulfillmentLabel(fulfillment.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Updated {formatDateTime(fulfillment.updatedAt)}. Captured{" "}
            {formatDateTime(settlement.capturedAt)}.
          </p>
        </div>
        {isFinalized ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Settled
          </span>
        ) : canReview ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            Admin action ready
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Review context
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock
          label="Buyer"
          title={bidder.userName || "Winner"}
          detail={bidder.email || bidder.phone || "No contact"}
        />
        <DetailBlock
          label="Seller"
          title={seller.userName || "Auctioneer"}
          detail={seller.email || seller.phone || "No contact"}
        />
      </div>

      <div className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-3 md:grid-cols-4">
        <MoneyBlock label="Winning bid" value={formatCurrency(winningAmount)} />
        <MoneyBlock label="Escrow held" value={formatCurrency(escrowAmount)} />
        <MoneyBlock label="Seller payout" value={formatCurrency(sellerPayoutAmount)} />
        <MoneyBlock label="Platform fee" value={formatCurrency(commissionAmount)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DetailBlock
          label="Delivery"
          title={getFulfillmentLabel(fulfillment.status)}
          detail={
            fulfillment.shipping?.trackingNumber
              ? `${fulfillment.shipping.carrier || "Carrier"} ${fulfillment.shipping.trackingNumber}`
              : fulfillment.addressSubmittedAt
                ? `Address submitted ${formatDateTime(fulfillment.addressSubmittedAt)}`
                : "Address not submitted yet"
          }
        />
        <DetailBlock
          label="Settlement note"
          title={settlement.note || "No admin note yet"}
          detail={
            settlement.releasedAt
              ? `Released ${formatDateTime(settlement.releasedAt)}`
              : settlement.refundedAt
                ? `Refunded ${formatDateTime(settlement.refundedAt)}`
                : "Awaiting final settlement"
          }
        />
      </div>

      {recentTimeline.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Recent timeline
          </p>
          <div className="mt-3 grid gap-2">
            {recentTimeline.map((entry, index) => (
              <div
                key={`${entry.createdAt || entry.title}-${index}`}
                className="rounded-md border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold text-slate-950">
                    {entry.title || getFulfillmentLabel(entry.status)}
                  </p>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.message && (
                  <p className="mt-1 leading-6 text-slate-600">{entry.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!canReview && (
        <SettlementNotice
          isFinalized={isFinalized}
          openDispute={openDispute}
          needsCaptureReview={needsCaptureReview}
        />
      )}

      {canReview && (
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Admin decision note
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) =>
                onNoteChange(fulfillment._id, event.target.value)
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Explain evidence reviewed and why funds are being released or refunded"
            />
            <span className="text-xs text-slate-500">
              Required before money moves. Minimum 10 characters.
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              disabled={!noteReady}
              onClick={() =>
                onReview(fulfillment._id, SETTLEMENT_ACTION.RELEASE_TO_SELLER)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              Release to seller
            </button>
            <button
              type="button"
              disabled={!noteReady}
              onClick={() =>
                onReview(fulfillment._id, SETTLEMENT_ACTION.REFUND_BUYER)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <RotateCcw className="h-4 w-4" />
              Refund buyer
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const SettlementNotice = ({ isFinalized, openDispute, needsCaptureReview }) => {
  let message = "This settlement is visible for monitoring, but it is not actionable.";
  if (isFinalized) {
    message = "Escrow has already been finalized. No further money action is available.";
  } else if (openDispute) {
    message = "Resolve the open delivery dispute before releasing or refunding escrow.";
  } else if (needsCaptureReview) {
    message =
      "Payment capture needs manual review. Captured escrow was not confirmed, so release/refund buttons are hidden.";
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
      <p className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </p>
    </div>
  );
};

const DetailBlock = ({ label, title, detail }) => (
  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 break-words font-semibold text-slate-950">{title}</p>
    <p className="mt-1 break-words text-sm text-slate-500">{detail}</p>
  </div>
);

const MoneyBlock = ({ label, value }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">
      {label}
    </p>
    <p className="mt-1 text-lg font-bold text-indigo-950">{value}</p>
  </div>
);

const SettlementSummaryCard = ({ label, value, detail, icon: Icon }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-indigo-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
    </div>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </div>
);

export default EscrowSettlementManagement;
