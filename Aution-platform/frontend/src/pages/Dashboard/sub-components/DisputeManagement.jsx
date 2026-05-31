/* eslint-disable react/prop-types */
import {
  DISPUTE_STATUS,
  SETTLEMENT_ACTION,
  getDisputeLabel,
  getDisputeTone,
  getIssueTypeLabel,
  getSettlementLabel,
  getSettlementTone,
  settlementActionOptions,
} from "@/lib/fulfillment";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getFulfillmentDisputes,
  reviewFulfillmentDispute,
} from "@/store/slices/superAdminSlice";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const statusFilters = ["Open", "Closed", "All"];

const reviewStatusOptions = [
  DISPUTE_STATUS.NEEDS_MORE_INFO,
  DISPUTE_STATUS.RESOLVED,
  DISPUTE_STATUS.BUYER_FAVORED,
  DISPUTE_STATUS.SELLER_FAVORED,
];

const getDefaultSettlementAction = (status) => {
  if (status === DISPUTE_STATUS.SELLER_FAVORED) {
    return SETTLEMENT_ACTION.RELEASE_TO_SELLER;
  }
  if (status === DISPUTE_STATUS.BUYER_FAVORED) {
    return SETTLEMENT_ACTION.REFUND_BUYER;
  }
  return SETTLEMENT_ACTION.NONE;
};

const DisputeManagement = () => {
  const dispatch = useDispatch();
  const { fulfillmentDisputes } = useSelector((state) => state.superAdmin);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    dispatch(getFulfillmentDisputes(statusFilter));
  }, [dispatch, statusFilter]);

  const updateReview = (id, field, value) => {
    setReviews((current) => ({
      ...current,
      [id]: {
        status: DISPUTE_STATUS.NEEDS_MORE_INFO,
        adminResolution: "",
        settlementAction: SETTLEMENT_ACTION.NONE,
        ...(current[id] || {}),
        [field]: value,
        ...(field === "status"
          ? { settlementAction: getDefaultSettlementAction(value) }
          : {}),
      },
    }));
  };

  const handleReview = async (fulfillmentId) => {
    const review = reviews[fulfillmentId] || {
      status: DISPUTE_STATUS.NEEDS_MORE_INFO,
      adminResolution: "",
      settlementAction: SETTLEMENT_ACTION.NONE,
    };
    const response = await dispatch(
      reviewFulfillmentDispute(fulfillmentId, review, statusFilter)
    );
    if (response?.success) {
      setReviews((current) => ({ ...current, [fulfillmentId]: undefined }));
    }
  };

  const openCount = fulfillmentDisputes.filter(
    (fulfillment) => fulfillment.dispute?.isOpen
  ).length;
  const respondedCount = fulfillmentDisputes.filter(
    (fulfillment) =>
      fulfillment.dispute?.status === DISPUTE_STATUS.SELLER_RESPONDED
  ).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <DisputeSummaryCard label="Visible disputes" value={fulfillmentDisputes.length} />
        <DisputeSummaryCard label="Open" value={openCount} />
        <DisputeSummaryCard label="Seller responded" value={respondedCount} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Review buyer-reported delivery issues, seller responses, and final outcomes.
        </p>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-44"
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {fulfillmentDisputes.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          No delivery disputes found for this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {fulfillmentDisputes.map((fulfillment) => (
            <DisputeCard
              key={fulfillment._id}
              fulfillment={fulfillment}
              review={reviews[fulfillment._id] || {}}
              updateReview={updateReview}
              onReview={handleReview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DisputeCard = ({ fulfillment, review, updateReview, onReview }) => {
  const dispute = fulfillment.dispute || {};
  const auction = fulfillment.auction || {};
  const bidder = fulfillment.bidder || {};
  const seller = fulfillment.seller || {};
  const reviewStatus = review.status || DISPUTE_STATUS.NEEDS_MORE_INFO;
  const settlement = fulfillment.settlement || {};
  const settlementAction =
    review.settlementAction || getDefaultSettlementAction(reviewStatus);

  return (
    <article className="grid gap-4 rounded-md border border-slate-200 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold text-slate-950">
              {auction.title || "Auction item"}
            </h3>
            <span
              className={`rounded-md px-3 py-1 text-xs font-bold ${getDisputeTone(
                dispute.status
              )}`}
            >
              {getDisputeLabel(dispute.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Reported {formatDateTime(dispute.reportedAt)} for{" "}
            {formatCurrency(fulfillment.winningAmount || auction.currentBid || 0)}
          </p>
        </div>
        {dispute.isOpen ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Needs review
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Closed
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

      <div className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">
            Escrow settlement
          </p>
          <p className="mt-1 text-sm leading-6 text-indigo-900">
            {formatCurrency(settlement.escrowAmount || fulfillment.winningAmount || 0)} held,
            {" "}
            {formatCurrency(settlement.sellerPayoutAmount || 0)} seller payout,
            {" "}
            {formatCurrency(settlement.commissionAmount || 0)} platform fee.
          </p>
        </div>
        <span
          className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${getSettlementTone(
            fulfillment.settlementStatus
          )}`}
        >
          {getSettlementLabel(fulfillment.settlementStatus)}
        </span>
      </div>

      <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-950">
          {getIssueTypeLabel(dispute.issueType)}
        </p>
        <p>{dispute.description || "No description provided."}</p>
        {dispute.sellerResponse && (
          <div className="rounded-md border border-amber-200 bg-white p-3 text-amber-800">
            <p className="font-semibold">Seller response</p>
            <p className="mt-1">{dispute.sellerResponse}</p>
          </div>
        )}
        {dispute.adminResolution && (
          <div className="rounded-md border border-emerald-200 bg-white p-3 text-emerald-800">
            <p className="font-semibold">Previous admin note</p>
            <p className="mt-1">{dispute.adminResolution}</p>
          </div>
        )}
      </div>

      {dispute.isOpen && (
        <div className="grid gap-3 lg:grid-cols-[190px_190px_1fr_auto]">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Decision
            </span>
            <select
              value={reviewStatus}
              onChange={(event) =>
                updateReview(fulfillment._id, "status", event.target.value)
              }
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {reviewStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getDisputeLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Money action
            </span>
            <select
              value={settlementAction}
              onChange={(event) =>
                updateReview(fulfillment._id, "settlementAction", event.target.value)
              }
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {settlementActionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Resolution note
            </span>
            <textarea
              rows={2}
              value={review.adminResolution || ""}
              onChange={(event) =>
                updateReview(fulfillment._id, "adminResolution", event.target.value)
              }
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Explain the next step or final decision"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onReview(fulfillment._id)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 md:w-auto"
            >
              Save review
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const DetailBlock = ({ label, title, detail }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 font-semibold text-slate-950">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{detail}</p>
  </div>
);

const DisputeSummaryCard = ({ label, value }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
  </div>
);

export default DisputeManagement;
