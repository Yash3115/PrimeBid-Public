import Spinner from "@/custom-components/Spinner";
import ActionCenter from "@/custom-components/ActionCenter";
import { buildSellerNextActions } from "@/lib/actionInsights";
import {
  FULFILLMENT_STATUS,
  getAuctionIdFromFulfillment,
  getFulfillmentLabel,
  getFulfillmentTone,
  sellerShipmentStatusOptions,
} from "@/lib/fulfillment";
import {
  formatCurrency,
  formatDateTime,
  formatReviewCount,
  formatSellerRating,
} from "@/lib/format";
import {
  getSellerDashboard,
  updateFulfillmentStatus,
} from "@/store/slices/auctionSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import {
  ArrowUpFromLine,
  Clock3,
  Eye,
  FileText,
  Gavel,
  PackageCheck,
  Plus,
  Star,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */
const SellerDashboard = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const { authChecked, isAuthenticated, user } = useSelector(
    (state) => state.user
  );
  const { sellerDashboard } = useSelector((state) => state.auction);
  const { wallet } = useSelector((state) => state.wallet);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigateTo("/");
      return;
    }
    dispatch(getSellerDashboard());
    dispatch(fetchWallet());
  }, [authChecked, dispatch, isAuthenticated, navigateTo, user.role]);

  const stats = sellerDashboard?.stats;
  const availableBalance = Number(wallet.availableBalance || 0);
  const endingSoon = sellerDashboard?.endingSoon || [];
  const noBidAuctions = sellerDashboard?.noBidAuctions || [];
  const recentAuctions = sellerDashboard?.recentAuctions || [];
  const fulfillmentQueue = sellerDashboard?.fulfillmentQueue || [];
  const healthQueue = sellerDashboard?.healthQueue || [];
  const nextActions = buildSellerNextActions({
    availableBalance,
    fulfillmentQueue,
    healthQueue,
    noBidAuctions,
  });
  const readyToShipCount = Number(stats?.fulfillment?.ReadyToShip || 0);
  const awaitingAddressCount = Number(stats?.fulfillment?.AwaitingAddress || 0);
  const cards = [
    {
      label: "Live",
      value: stats?.liveAuctions || 0,
      detail: "Auctions accepting bids",
      icon: Gavel,
    },
    {
      label: "Drafts",
      value: stats?.draftAuctions || 0,
      detail: "Listings waiting to publish",
      icon: FileText,
    },
    {
      label: "Total Bids",
      value: stats?.totalBids || 0,
      detail: "Bidding activity across listings",
      icon: Users,
    },
    {
      label: "To Ship",
      value: readyToShipCount,
      detail: `${awaitingAddressCount} waiting for buyer address`,
      icon: PackageCheck,
    },
    {
      label: "Withdrawable",
      value: formatCurrency(availableBalance),
      detail: "Wallet balance available for payout",
      icon: Wallet,
    },
  ];

  return (
    <section className="app-page">
      <div className="app-container grid gap-6">
        <div className="grid gap-5 rounded-lg border border-indigo-100 bg-white p-5 shadow-sm md:p-6 xl:grid-cols-[1fr_420px] xl:items-center">
          <div>
            <p className="app-kicker">
              Seller Command Center
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-950 md:text-5xl">
              Manage Listings, Bids, and Payouts
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Keep auctions moving, spot listings that need attention, and
              withdraw proceeds directly from your wallet.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/create-auction"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5" />
                Create Auction
              </Link>
              <Link
                to="/view-my-auctions"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Eye className="h-5 w-5" />
                My Auctions
              </Link>
              <Link
                to="/wallet#withdraw"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <ArrowUpFromLine className="h-5 w-5" />
                Withdraw
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Reputation
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                  {formatSellerRating(stats?.reputation)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatReviewCount(stats?.reputation?.ratingCount)}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <Star className="h-5 w-5" />
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMetric
                label="Watchers"
                value={stats?.watcherCount || 0}
              />
              <MiniMetric
                label="Platform fee"
                value="5%"
              />
            </div>
          </div>
        </div>

        {!authChecked || !stats ? (
          <Spinner />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ icon: Icon, label, value, detail }) => (
                <MetricCard
                  key={label}
                  icon={Icon}
                  label={label}
                  value={value}
                  detail={detail}
                />
              ))}
            </div>

            <ActionCenter
              title="Seller Next Actions"
              subtitle="Prioritized work across shipments, listing health, and payouts."
              emptyTitle="No seller actions waiting"
              emptyText="Your active auctions and fulfillment queue are in good shape."
              actions={nextActions}
            />

            <Panel id="fulfillment" title="Fulfillment Queue">
              {fulfillmentQueue.length > 0 ? (
                <div className="grid gap-4">
                  {fulfillmentQueue.map((fulfillment) => (
                    <SellerFulfillmentCard
                      key={fulfillment._id}
                      fulfillment={fulfillment}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No shipments pending"
                  text="Won auctions will appear here after buyers add delivery details."
                />
              )}
            </Panel>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Top Auction">
                {sellerDashboard.topAuction ? (
                  <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                    <img
                      src={
                        sellerDashboard.topAuction.image?.url ||
                        "/imageHolder.jpg"
                      }
                      alt={sellerDashboard.topAuction.title}
                      className="h-40 w-full rounded-md object-cover"
                    />
                    <div>
                      <Link
                        to={`/auction/details/${sellerDashboard.topAuction._id}`}
                        className="text-2xl font-bold text-slate-950 hover:text-indigo-700"
                      >
                        {sellerDashboard.topAuction.title}
                      </Link>
                      <p className="mt-3 text-sm text-slate-500">
                        {formatDateTime(sellerDashboard.topAuction.startTime)} to{" "}
                        {formatDateTime(sellerDashboard.topAuction.endTime)}
                      </p>
                      <p className="mt-4 w-fit rounded-md bg-indigo-50 px-3 py-2 font-bold text-indigo-700">
                        {formatCurrency(sellerDashboard.topAuction.currentBid)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No auction data yet"
                    text="Create an auction to start tracking seller performance."
                    action={{ label: "Create Auction", to: "/create-auction" }}
                  />
                )}
              </Panel>

              <Panel title="Seller Attention Queue">
                <div className="grid gap-3">
                  {noBidAuctions.map((auction) => (
                    <AuctionRow
                      key={auction._id}
                      auction={auction}
                      label="No bids yet"
                      tone="amber"
                    />
                  ))}
                  {endingSoon.map((auction) => (
                    <AuctionRow
                      key={auction._id}
                      auction={auction}
                      label="Ending soon"
                      tone="indigo"
                    />
                  ))}
                  {noBidAuctions.length === 0 && endingSoon.length === 0 && (
                    <EmptyState
                      title="No urgent seller actions"
                      text="Auctions with no bids or closing soon will appear here."
                    />
                  )}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <Panel title="Recent Listings">
                {recentAuctions.length > 0 ? (
                  <div className="grid gap-3">
                    {recentAuctions.map((auction) => (
                      <AuctionRow
                        key={auction._id}
                        auction={auction}
                        label={auction.runtimeStatus || auction.status}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No listings yet"
                    text="Drafts, live auctions, and ended auctions will appear here."
                  />
                )}
              </Panel>

              <Panel title="Recent Reviews">
                {(sellerDashboard.recentReviews || []).length > 0 ? (
                  <div className="grid gap-3">
                    {sellerDashboard.recentReviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-md border border-slate-200 p-3"
                      >
                        <p className="font-semibold text-slate-950">
                          {review.rating} stars
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {review.comment || "No comment"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No reviews yet"
                    text="Buyer feedback will appear after completed sales."
                  />
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const MetricCard = ({ icon: Icon, label, value, detail }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <p className="mt-3 text-sm text-slate-500">{detail}</p>
  </div>
);

const MiniMetric = ({ label, value }) => (
  <div className="rounded-md border border-slate-200 bg-white p-3">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
  </div>
);

const Panel = ({ title, children, id }) => (
  <section
    id={id}
    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
  >
    <h2 className="mb-4 text-xl font-semibold text-slate-950">{title}</h2>
    {children}
  </section>
);

const AuctionRow = ({ auction, label, tone = "slate" }) => {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    indigo: "bg-indigo-50 text-indigo-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <Link
      to={`/auction/details/${auction._id}`}
      className="grid gap-3 rounded-md border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40 sm:grid-cols-[64px_1fr_auto] sm:items-center"
    >
      <img
        src={auction.image?.url || "/imageHolder.jpg"}
        alt={auction.title}
        className="h-16 w-16 rounded-md object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{auction.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Clock3 className="h-4 w-4" />
          Ends {formatDateTime(auction.endTime)}
        </p>
      </div>
      <span
        className={`inline-flex w-fit items-center rounded-md px-3 py-2 text-sm font-bold ${toneClass}`}
      >
        {label}
      </span>
    </Link>
  );
};

const EmptyState = ({ title, text, action }) => (
  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <p className="font-semibold text-slate-950">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{text}</p>
    {action && (
      <Link
        to={action.to}
        className="mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        {action.label}
      </Link>
    )}
  </div>
);

const sellerInputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getInitialSellerStatus = (status) =>
  [FULFILLMENT_STATUS.AWAITING_ADDRESS, FULFILLMENT_STATUS.READY_TO_SHIP].includes(
    status
  )
    ? FULFILLMENT_STATUS.SHIPPED
    : status;

const SellerFulfillmentCard = ({ fulfillment }) => {
  const dispatch = useDispatch();
  const auction = fulfillment.auction || {};
  const bidder = fulfillment.bidder || {};
  const address = fulfillment.deliveryAddress;
  const shipping = fulfillment.shipping || {};
  const [form, setForm] = useState({
    status: getInitialSellerStatus(fulfillment.status),
    carrier: shipping.carrier || "",
    trackingNumber: shipping.trackingNumber || "",
    trackingUrl: shipping.trackingUrl || "",
    estimatedDeliveryDate: toDateInputValue(shipping.estimatedDeliveryDate),
    sellerNote: shipping.sellerNote || "",
  });
  const hasAddress = Boolean(address?.addressLine1);
  const auctionId = getAuctionIdFromFulfillment(fulfillment);

  useEffect(() => {
    setForm({
      status: getInitialSellerStatus(fulfillment.status),
      carrier: shipping.carrier || "",
      trackingNumber: shipping.trackingNumber || "",
      trackingUrl: shipping.trackingUrl || "",
      estimatedDeliveryDate: toDateInputValue(shipping.estimatedDeliveryDate),
      sellerNote: shipping.sellerNote || "",
    });
  }, [fulfillment.status, shipping.carrier, shipping.estimatedDeliveryDate, shipping.sellerNote, shipping.trackingNumber, shipping.trackingUrl]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(updateFulfillmentStatus(auctionId, form));
  };

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[92px_1fr]">
      <img
        src={auction.image?.url || "/imageHolder.jpg"}
        alt={auction.title || "Auction item"}
        className="h-24 w-24 rounded-md object-cover"
      />
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to={auctionId ? `/auction/details/${auctionId}` : "/seller-dashboard"}
              className="text-lg font-bold text-slate-950 hover:text-indigo-700"
            >
              {auction.title || "Auction item"}
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Buyer: {bidder.userName || "Winner"}
              {bidder.phone ? ` | ${bidder.phone}` : ""}
            </p>
          </div>
          <span
            className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${getFulfillmentTone(
              fulfillment.status
            )}`}
          >
            {getFulfillmentLabel(fulfillment.status)}
          </span>
        </div>

        {hasAddress ? (
          <div className="grid gap-1 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-950">
              Ship to {address.fullName}
            </p>
            <p>
              {[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p>Phone: {address.phone}</p>
            {address.instructions && <p>Instructions: {address.instructions}</p>}
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            Waiting for the bidder to add delivery details. Shipment updates are
            disabled until the address is submitted.
          </div>
        )}

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Status
            </span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              className={sellerInputClass}
              disabled={!hasAddress}
            >
              {sellerShipmentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getFulfillmentLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Carrier
            </span>
            <input
              value={form.carrier}
              onChange={(event) => updateField("carrier", event.target.value)}
              className={sellerInputClass}
              disabled={!hasAddress}
              placeholder="Delhivery, Bluedart, India Post"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Tracking number
            </span>
            <input
              value={form.trackingNumber}
              onChange={(event) =>
                updateField("trackingNumber", event.target.value)
              }
              className={sellerInputClass}
              disabled={!hasAddress}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Tracking URL
            </span>
            <input
              value={form.trackingUrl}
              onChange={(event) => updateField("trackingUrl", event.target.value)}
              className={sellerInputClass}
              disabled={!hasAddress}
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Estimated delivery
            </span>
            <input
              type="date"
              value={form.estimatedDeliveryDate}
              onChange={(event) =>
                updateField("estimatedDeliveryDate", event.target.value)
              }
              className={sellerInputClass}
              disabled={!hasAddress}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Seller note
            </span>
            <input
              value={form.sellerNote}
              onChange={(event) => updateField("sellerNote", event.target.value)}
              className={sellerInputClass}
              disabled={!hasAddress}
              placeholder="Packed carefully, fragile item, etc."
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!hasAddress}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              <Truck className="h-5 w-5" />
              Update Shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellerDashboard;
