import Spinner from "@/custom-components/Spinner";
import {
  canConfirmDelivery,
  canEditDeliveryAddress,
  disputeIssueTypeOptions,
  getDisputeLabel,
  getDisputeTone,
  getFulfillmentLabel,
  getFulfillmentTone,
  getIssueTypeLabel,
  getSettlementLabel,
  getSettlementTone,
  hasOpenDispute,
  SETTLEMENT_STATUS,
} from "@/lib/fulfillment";
import {
  formatCurrency,
  formatDateTime,
  formatReviewCount,
  formatSellerRating,
} from "@/lib/format";
import { reviewSeller } from "@/store/slices/auctionSlice";
import {
  confirmFulfillmentDelivery,
  fetchWonAuctions,
  reportFulfillmentIssue,
  submitDeliveryAddress,
} from "@/store/slices/userSlice";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Trophy,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const buildAddressForm = (fulfillment, user) => ({
  fullName: fulfillment?.deliveryAddress?.fullName || user?.userName || "",
  phone: fulfillment?.deliveryAddress?.phone || user?.phone || "",
  addressLine1:
    fulfillment?.deliveryAddress?.addressLine1 || user?.address || "",
  addressLine2: fulfillment?.deliveryAddress?.addressLine2 || "",
  city: fulfillment?.deliveryAddress?.city || "",
  state: fulfillment?.deliveryAddress?.state || "",
  postalCode: fulfillment?.deliveryAddress?.postalCode || "",
  country: fulfillment?.deliveryAddress?.country || "India",
  instructions: fulfillment?.deliveryAddress?.instructions || "",
});

const WonAuctions = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const { authChecked, isAuthenticated, user, wonAuctions } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Bidder") {
      navigateTo("/");
      return;
    }
    dispatch(fetchWonAuctions());
  }, [authChecked, dispatch, isAuthenticated, navigateTo, user.role]);

  return (
    <section className="app-page">
      <div className="app-container-narrow">
        <div className="mb-6">
          <p className="app-kicker">Bidder</p>
          <h1 className="app-title">Won Auctions</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Add delivery details, follow shipment updates, and leave feedback
            after the item handoff is complete.
          </p>
        </div>

        {!authChecked ? (
          <Spinner />
        ) : wonAuctions.length > 0 ? (
          <div className="grid gap-5">
            {wonAuctions.map((auction) => (
              <WonAuctionCard
                key={auction._id}
                auction={auction}
                currentUser={user}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <Trophy className="mx-auto h-10 w-10 text-indigo-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              No wins yet.
            </h2>
          </div>
        )}
      </div>
    </section>
  );
};

const WonAuctionCard = ({ auction, currentUser }) => {
  const dispatch = useDispatch();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [addressForm, setAddressForm] = useState(() =>
    buildAddressForm(auction.fulfillment, currentUser)
  );
  const [issueForm, setIssueForm] = useState({
    issueType: "NotDelivered",
    description: "",
  });
  const handoff = auction.winnerHandoff || {};
  const seller = handoff.seller || {};
  const fulfillment = auction.fulfillment;
  const fulfillmentStatus = fulfillment?.status || "AwaitingAddress";
  const addressIsEditable = canEditDeliveryAddress(fulfillmentStatus);
  const hasAddress = Boolean(fulfillment?.deliveryAddress?.addressLine1);
  const sellerRating = formatSellerRating(
    seller.ratingAverage,
    seller.ratingCount
  );
  const canReviewSeller =
    fulfillment?.settlementStatus === SETTLEMENT_STATUS.RELEASED_TO_SELLER;

  useEffect(() => {
    setAddressForm(buildAddressForm(auction.fulfillment, currentUser));
  }, [auction.fulfillment, currentUser]);

  const addressSummary = useMemo(() => {
    const address = fulfillment?.deliveryAddress;
    if (!address) return "";
    return [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, [fulfillment]);

  const updateAddressField = (field, value) => {
    setAddressForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    dispatch(submitDeliveryAddress(auction._id, addressForm));
  };

  const updateIssueField = (field, value) => {
    setIssueForm((current) => ({ ...current, [field]: value }));
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    const response = await dispatch(reportFulfillmentIssue(auction._id, issueForm));
    if (response?.success) {
      setIssueForm({ issueType: "NotDelivered", description: "" });
    }
  };

  const handleConfirmDelivery = () => {
    dispatch(confirmFulfillmentDelivery(auction._id));
  };

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[160px_1fr]">
      <img
        src={auction.image?.url || "/imageHolder.jpg"}
        alt={auction.title}
        className="h-40 w-full rounded-md object-cover md:h-full"
      />
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to={`/auction/item/${auction._id}`}
              className="text-2xl font-bold text-slate-950 hover:text-indigo-700"
            >
              {auction.title}
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Ended {formatDateTime(auction.endTime)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <p className="rounded-md bg-emerald-50 px-3 py-2 font-bold text-emerald-700">
              {formatCurrency(auction.currentBid)}
            </p>
            <p
              className={`rounded-md px-3 py-2 text-sm font-bold ${getFulfillmentTone(
                fulfillmentStatus
              )}`}
            >
              {getFulfillmentLabel(fulfillmentStatus)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-md bg-indigo-50 p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-700" />
            <h3 className="font-semibold text-indigo-950">Winner handoff</h3>
          </div>
          <ul className="grid gap-2 text-sm leading-6 text-indigo-950">
            {(handoff.nextSteps || []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                Seller contact
              </p>
              <p className="font-semibold text-slate-950">
                {seller.userName || "Seller details unavailable"}
              </p>
              {seller.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  <Mail className="h-4 w-4" />
                  {seller.email}
                </a>
              )}
              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  <Phone className="h-4 w-4" />
                  {seller.phone}
                </a>
              )}
              <p className="text-sm text-slate-600">
                {sellerRating === "No rating yet"
                  ? "No seller reviews yet"
                  : `Rating ${sellerRating} from ${formatReviewCount(
                      seller.ratingCount
                    )}`}
              </p>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                Settlement
              </p>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {handoff.payment?.method || "PrimeBid wallet"}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                {handoff.payment?.status ||
                  "Winning funds are captured automatically at auction close."}
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Delivery details
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                {hasAddress ? "Ship to this address" : "Add delivery address"}
              </h3>
            </div>
            <span
              className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${getFulfillmentTone(
                fulfillmentStatus
              )}`}
            >
              {getFulfillmentLabel(fulfillmentStatus)}
            </span>
          </div>

          {hasAddress && (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">
                {fulfillment.deliveryAddress.fullName}
              </p>
              <p>{addressSummary}</p>
              <p>Phone: {fulfillment.deliveryAddress.phone}</p>
              {fulfillment.deliveryAddress.instructions && (
                <p>Instructions: {fulfillment.deliveryAddress.instructions}</p>
              )}
            </div>
          )}

          {addressIsEditable ? (
            <DeliveryAddressForm
              addressForm={addressForm}
              updateAddressField={updateAddressField}
              onSubmit={handleAddressSubmit}
              hasAddress={hasAddress}
            />
          ) : (
            <p className="rounded-md bg-white p-3 text-sm text-slate-600">
              Shipment has already started, so delivery address changes are
              locked. Contact support if this address is wrong.
            </p>
          )}
        </section>

        <SettlementPanel fulfillment={fulfillment} />

        <ShipmentPanel
          fulfillment={fulfillment}
          onConfirmDelivery={handleConfirmDelivery}
        />

        <DisputePanel
          fulfillment={fulfillment}
          issueForm={issueForm}
          updateIssueField={updateIssueField}
          onSubmit={handleIssueSubmit}
        />

        <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[150px_1fr_auto] md:items-center">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Rating
            </span>
            <select
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Comment
            </span>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
              placeholder="Seller feedback"
            />
          </label>
          <button
            type="button"
            onClick={() => dispatch(reviewSeller(auction._id, { rating, comment }))}
            disabled={!canReviewSeller}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <Star className="h-4 w-4" />
            {canReviewSeller ? "Save" : "Available after escrow release"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeliveryAddressForm = ({
  addressForm,
  updateAddressField,
  onSubmit,
  hasAddress,
}) => (
  <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
    {[
      ["fullName", "Full name", "text"],
      ["phone", "Phone", "tel"],
      ["addressLine1", "Address line 1", "text"],
      ["addressLine2", "Address line 2", "text"],
      ["city", "City", "text"],
      ["state", "State", "text"],
      ["postalCode", "Postal code", "text"],
      ["country", "Country", "text"],
    ].map(([field, label, type]) => (
      <label key={field} className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
        <input
          type={type}
          value={addressForm[field]}
          onChange={(event) => updateAddressField(field, event.target.value)}
          className={inputClass}
          required={field !== "addressLine2"}
        />
      </label>
    ))}
    <label className="grid gap-1 md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Delivery instructions
      </span>
      <textarea
        rows={3}
        value={addressForm.instructions}
        onChange={(event) => updateAddressField("instructions", event.target.value)}
        className={`${inputClass} resize-y`}
        placeholder="Gate code, preferred time, landmark, etc."
      />
    </label>
    <div className="md:col-span-2">
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
      >
        <MapPin className="h-5 w-5" />
        {hasAddress ? "Update Delivery Address" : "Save Delivery Address"}
      </button>
    </div>
  </form>
);

const SettlementPanel = ({ fulfillment }) => {
  const settlement = fulfillment?.settlement || {};
  const settlementStatus = fulfillment?.settlementStatus;

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-950">Escrow settlement</h3>
        </div>
        <span
          className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${getSettlementTone(
            settlementStatus
          )}`}
        >
          {getSettlementLabel(settlementStatus)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SettlementMetric
          label="Held amount"
          value={formatCurrency(settlement.escrowAmount || fulfillment?.winningAmount || 0)}
        />
        <SettlementMetric
          label="Platform fee"
          value={formatCurrency(settlement.commissionAmount || 0)}
        />
        <SettlementMetric
          label="Seller payout"
          value={formatCurrency(settlement.sellerPayoutAmount || 0)}
        />
      </div>
      <p className="rounded-md bg-indigo-50 p-3 text-sm leading-6 text-indigo-900">
        PrimeBid releases escrow to the seller only after you confirm delivery, or
        after admin resolves a dispute.
      </p>
    </section>
  );
};

const SettlementMetric = ({ label, value }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 flex items-center gap-1.5 font-bold text-slate-950">
      <IndianRupee className="h-4 w-4 text-slate-400" />
      {value}
    </p>
  </div>
);

const ShipmentPanel = ({ fulfillment, onConfirmDelivery }) => {
  const shipping = fulfillment?.shipping || {};
  const timeline = fulfillment?.timeline || [];
  const confirmEnabled = canConfirmDelivery(fulfillment);

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-950">Shipment updates</h3>
        </div>
        {confirmEnabled && (
          <button
            type="button"
            onClick={onConfirmDelivery}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            Confirm Received
          </button>
        )}
      </div>
      {shipping.trackingNumber ? (
        <div className="grid gap-1 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-950">Carrier:</span>{" "}
            {shipping.carrier || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-slate-950">Tracking:</span>{" "}
            {shipping.trackingNumber}
          </p>
          {shipping.trackingUrl && (
            <a
              href={shipping.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Open tracking link
            </a>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Tracking details will appear after the seller marks the item shipped.
        </p>
      )}
      {timeline.length > 0 && (
        <div className="grid gap-2">
          {timeline.map((event) => (
            <div
              key={`${event.status}-${event.createdAt}-${event.title}`}
              className="rounded-md border border-slate-200 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{event.title}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
              <p className="mt-1 leading-6 text-slate-600">{event.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const DisputePanel = ({ fulfillment, issueForm, updateIssueField, onSubmit }) => {
  const dispute = fulfillment?.dispute;
  const openDispute = hasOpenDispute(fulfillment);

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-slate-950">Delivery support</h3>
        </div>
        {dispute?.status && (
          <span
            className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${getDisputeTone(
              dispute.status
            )}`}
          >
            {getDisputeLabel(dispute.status)}
          </span>
        )}
      </div>

      {dispute?.status ? (
        <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <div>
            <p className="font-semibold text-slate-950">
              {getIssueTypeLabel(dispute.issueType)}
            </p>
            <p className="mt-1">{dispute.description}</p>
          </div>
          {dispute.sellerResponse && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <p className="font-semibold">Seller response</p>
              <p className="mt-1">{dispute.sellerResponse}</p>
            </div>
          )}
          {dispute.adminResolution && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <p className="font-semibold">Admin resolution</p>
              <p className="mt-1">{dispute.adminResolution}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Report delivery problems from here. The seller and admin team will see the
          issue with the shipment timeline.
        </p>
      )}

      {!openDispute && (
        <form className="grid gap-3 md:grid-cols-[220px_1fr_auto]" onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Issue
            </span>
            <select
              value={issueForm.issueType}
              onChange={(event) => updateIssueField("issueType", event.target.value)}
              className={inputClass}
            >
              {disputeIssueTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              What happened?
            </span>
            <textarea
              rows={2}
              value={issueForm.description}
              onChange={(event) => updateIssueField("description", event.target.value)}
              className={`${inputClass} resize-y`}
              placeholder="Describe the issue clearly"
              required
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-800 transition hover:bg-amber-100 md:w-auto"
            >
              <AlertTriangle className="h-5 w-5" />
              Report
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default WonAuctions;
