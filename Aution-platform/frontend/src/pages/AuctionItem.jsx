import Spinner from "@/custom-components/Spinner";
import {
  getBidderAuctionBidEntry,
  getBidderAuctionLock,
  getBidWalletRequirement,
} from "@/lib/bidWallet";
import { useAuctionLiveSync } from "@/hooks/useAuctionLiveSync";
import {
  formatCurrency,
  formatDateTime,
  formatSellerRating,
  getAuctionStatus,
} from "@/lib/format";
import {
  formatPercent,
  getSellerQuality,
  getSellerRiskClass,
  getSellerRiskSummary,
  getTrustBadgeClass,
  normalizeTrustBadges,
} from "@/lib/sellerQuality";
import {
  checkAuctionSync,
  getAuctionDetail,
  getBidAdvice,
  summarizeAuction,
} from "@/store/slices/auctionSlice";
import { manageAutoBid, placeBid } from "@/store/slices/bidSlice";
import { addToWatchlist, removeFromWatchlist } from "@/store/slices/userSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import {
  BadgeCheck,
  Ban,
  Gavel,
  Heart,
  Home,
  IndianRupee,
  List,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";

/* eslint-disable react/prop-types */
const getRank = (index) => {
  if (index === 0) return "1st";
  if (index === 1) return "2nd";
  if (index === 2) return "3rd";
  return `${index + 1}th`;
};

const AuctionItem = () => {
  const { id } = useParams();
  const {
    aiActionLoading,
    auctionDetail,
    auctionBidders,
    auctionSummary,
    bidAdvice,
    loading,
    myAutoBid,
    serverTime,
    serverTimeReceivedAt,
  } = useSelector(
    (state) => state.auction
  );
  const { loading: bidLoading } = useSelector((state) => state.bid);
  const { wallet } = useSelector((state) => state.wallet);
  const { authChecked, isAuthenticated, user, watchlist, watchlistLoading } =
    useSelector((state) => state.user);
  const [amount, setAmount] = useState("");
  const [maxAutoBid, setMaxAutoBid] = useState("");
  const [autoBidLimit, setAutoBidLimit] = useState("");
  const location = useLocation();
  const dispatch = useDispatch();

  const bidders = Array.isArray(auctionBidders) ? auctionBidders : [];
  const status = getAuctionStatus(
    auctionDetail,
    undefined,
    serverTime,
    serverTimeReceivedAt
  );
  const isLive = status === "Live" && auctionDetail.status !== "Draft";
  const currentBid = Number(auctionDetail.currentBid || auctionDetail.startingBid || 0);
  const bidIncrement = Number(auctionDetail.minimumBidIncrement || 1);
  const nextBid = currentBid + bidIncrement;
  const createdById = auctionDetail.createdBy?._id || auctionDetail.createdBy;
  const sellerQuality = getSellerQuality(auctionDetail);
  const isOwnAuction =
    createdById?.toString?.() === user?._id?.toString?.();
  const isSaved = watchlist.some((auction) => auction._id === auctionDetail._id);
  const bidAmount = Number(amount);
  const maxAutoBidAmount = maxAutoBid === "" ? null : Number(maxAutoBid);
  const isBidder = user?.role === "Bidder";
  const walletAvailable = Number(
    wallet.availableBalance ?? user?.wallet?.availableBalance ?? 0
  );
  const walletLocked = Number(
    wallet.lockedBalance ?? user?.wallet?.lockedBalance ?? 0
  );
  const ownBidEntry = getBidderAuctionBidEntry(bidders, user?._id);
  const ownBidAmount = Number(ownBidEntry?.amount || 0);
  const currentAuctionLock = getBidderAuctionLock(bidders, user?._id);
  const previewBidAmount =
    Number.isFinite(bidAmount) && bidAmount > 0 ? bidAmount : nextBid;
  const previewWalletRequirement = getBidWalletRequirement({
    walletAvailable,
    bidAmount: previewBidAmount,
    currentAuctionLock,
  });
  const submitWalletRequirement = getBidWalletRequirement({
    walletAvailable,
    bidAmount,
    currentAuctionLock,
  });
  const canSubmitBid =
    isLive &&
    isBidder &&
    !isOwnAuction &&
    Number.isFinite(bidAmount) &&
    bidAmount >= nextBid &&
    (maxAutoBidAmount === null || maxAutoBidAmount >= bidAmount) &&
    (!isBidder || submitWalletRequirement.canCover) &&
    !bidLoading;
  const quickBids = [nextBid, currentBid + bidIncrement * 3, currentBid + bidIncrement * 5].filter(
    (value, index, values) => value > currentBid && values.indexOf(value) === index
  );
  const autoBidLimitAmount = Number(autoBidLimit);
  const canUpdateAutoBid =
    isLive &&
    isBidder &&
    ownBidAmount > 0 &&
    Number.isFinite(autoBidLimitAmount) &&
    autoBidLimitAmount > ownBidAmount &&
    !bidLoading;
  const bidValidationMessage = !isLive
    ? "Bidding is only available while the auction is live."
    : isOwnAuction
      ? "You cannot bid on your own auction."
      : !isBidder
        ? "Only bidder accounts can place bids. Use a bidder account to participate."
      : !Number.isFinite(bidAmount)
        ? `Enter at least ${formatCurrency(nextBid)} to bid.`
        : bidAmount < nextBid
          ? `Your bid must be at least ${formatCurrency(nextBid)}.`
          : maxAutoBidAmount !== null && maxAutoBidAmount < bidAmount
            ? "Auto-bid max must be greater than or equal to your bid."
            : isBidder && submitWalletRequirement.shortfall > 0
              ? `Add ${formatCurrency(submitWalletRequirement.shortfall)} to your wallet before bidding.`
            : "";

  const descriptionItems = useMemo(
    () =>
      auctionDetail.description
        ? auctionDetail.description.split(". ").filter(Boolean)
        : [],
    [auctionDetail.description]
  );

  const handleBid = async (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `Place a bid of ${formatCurrency(Number(amount || 0))}? Bids are binding while the auction is live.`
    );
    if (!confirmed) return;
    const result = await dispatch(
      placeBid(id, {
        amount,
        maxAutoBid,
        expectedBidVersion: auctionDetail.bidVersion || 0,
      })
    );
    if (result?.success) {
      setAmount("");
      setMaxAutoBid("");
    }
  };

  const handleAutoBidUpdate = async (e) => {
    e?.preventDefault();
    const result = await dispatch(
      manageAutoBid(id, {
        maxAutoBid: autoBidLimit,
        expectedBidVersion: auctionDetail.bidVersion || 0,
      })
    );
    if (result?.autoBid?.active) {
      setAutoBidLimit(String(result.autoBid.maxAmount));
    }
  };

  const handleAutoBidCancel = async () => {
    const result = await dispatch(
      manageAutoBid(id, {
        action: "cancel",
        expectedBidVersion: auctionDetail.bidVersion || 0,
      })
    );
    if (result?.success) {
      setAutoBidLimit("");
    }
  };

  const handleWatchlist = () => {
    if (isSaved) {
      dispatch(removeFromWatchlist(auctionDetail._id));
    } else {
      dispatch(addToWatchlist(auctionDetail._id));
    }
  };

  const getAiAuctionPayload = () => ({
    title: auctionDetail.title,
    description: auctionDetail.description,
    category: auctionDetail.category,
    condition: auctionDetail.condition,
    currentBid,
    startingBid: auctionDetail.startingBid,
    minimumBidIncrement: bidIncrement,
    bidCount: bidders.length,
  });

  const handleSummary = () => {
    if (!isAuthenticated) return;
    dispatch(summarizeAuction(getAiAuctionPayload()));
  };

  const handleBidAdvice = () => {
    if (!isAuthenticated) return;
    dispatch(getBidAdvice(getAiAuctionPayload(), amount || nextBid));
  };

  const refreshLiveAuction = () => {
    dispatch(getAuctionDetail(id, { silent: true }));
    if (isAuthenticated && user?.role === "Bidder") {
      dispatch(fetchWallet());
    }
  };

  const liveSyncConnected = useAuctionLiveSync({
    auctionId: id,
    bidVersion: auctionDetail.bidVersion,
    enabled: Boolean(
      id && auctionDetail._id && auctionDetail.status !== "Draft"
    ),
    onChange: refreshLiveAuction,
  });

  useEffect(() => {
    if (!id) return undefined;
    dispatch(getAuctionDetail(id));
    return undefined;
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return undefined;
    const interval = setInterval(() => {
      dispatch(checkAuctionSync(id, auctionDetail.bidVersion || 0));
    }, liveSyncConnected ? 15000 : isLive ? 5000 : 12000);
    return () => clearInterval(interval);
  }, [auctionDetail.bidVersion, dispatch, id, isLive, liveSyncConnected]);

  useEffect(() => {
    if (authChecked && isAuthenticated && user.role === "Bidder") {
      dispatch(fetchWallet());
    }
  }, [authChecked, dispatch, isAuthenticated, user.role]);

  useEffect(() => {
    if (!auctionDetail._id) return;
    const payload = {
      _id: auctionDetail._id,
      title: auctionDetail.title,
      image: auctionDetail.image,
      startTime: auctionDetail.startTime,
      endTime: auctionDetail.endTime,
      startingBid: auctionDetail.startingBid,
      currentBid: auctionDetail.currentBid,
      category: auctionDetail.category,
      createdBy: auctionDetail.createdBy,
      runtimeStatus: auctionDetail.runtimeStatus,
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem("primebid_recently_viewed") || "[]"
      );
      const next = [
        payload,
        ...existing.filter((item) => item._id !== auctionDetail._id),
      ].slice(0, 12);
      localStorage.setItem("primebid_recently_viewed", JSON.stringify(next));
    } catch {
      localStorage.setItem("primebid_recently_viewed", JSON.stringify([payload]));
    }
  }, [auctionDetail]);

  useEffect(() => {
    setAutoBidLimit(
      myAutoBid?.active && myAutoBid.maxAmount ? String(myAutoBid.maxAmount) : ""
    );
  }, [myAutoBid?.active, myAutoBid?.maxAmount]);

  return (
    <section className="app-page">
      <div className="app-container flex flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-indigo-700">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span>/</span>
          <Link to="/auctions" className="font-semibold text-slate-700 hover:text-indigo-700">
            Auctions
          </Link>
          <span>/</span>
          <span className="max-w-[260px] truncate">{auctionDetail.title}</span>
        </nav>

        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
            <div className="order-1 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)] lg:p-6">
                <div className="overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={auctionDetail.image?.url || "/imageHolder.jpg"}
                    alt={auctionDetail.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                      {status}
                    </span>
                    {isAuthenticated && !isOwnAuction && (
                      <button
                        type="button"
                        onClick={handleWatchlist}
                        disabled={watchlistLoading || !auctionDetail._id}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold transition ${
                          isSaved
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                    )}
                  </div>
                  <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
                    {auctionDetail.title}
                  </h1>
                  <div className="fluid-stat-grid mt-5 grid gap-3">
                    <Info label="Condition" value={auctionDetail.condition || "Not set"} />
                    <Info label="Category" value={auctionDetail.category || "Not set"} />
                    <Info label="Minimum Bid" value={formatCurrency(auctionDetail.startingBid)} />
                    <Info label="Current Bid" value={formatCurrency(currentBid)} />
                    <Info label="Bid Increment" value={formatCurrency(bidIncrement)} />
                    <Info label="Extension" value={`${auctionDetail.antiSnipingExtensionMinutes || 0} min`} />
                    <Info label="Seller Rating" value={formatSellerRating(auctionDetail.createdBy?.reputation)} />
                    <Info label="Starts" value={formatDateTime(auctionDetail.startTime)} />
                    <Info label="Ends" value={formatDateTime(auctionDetail.endTime)} />
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {normalizeTrustBadges(sellerQuality, auctionDetail.createdBy)
                      .slice(0, 4)
                      .map((badge) => (
                        <TrustNote
                          key={badge.id}
                          icon={ShieldCheck}
                          text={badge.label}
                          tone={badge.tone}
                          title={badge.description}
                        />
                      ))}
                    <TrustNote icon={WalletIcon} text="Wallet funds are held visibly" />
                    <TrustNote icon={BadgeCheck} text="Winning bid settles automatically" />
                    <TrustNote icon={Timer} text={`${auctionDetail.antiSnipingExtensionMinutes || 0} min anti-sniping extension`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="order-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-xl font-semibold text-slate-950">Bids</h2>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                      liveSyncConnected
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {liveSyncConnected ? "Live sync" : "Auto refresh"}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    {bidders.length} total
                  </span>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-5">
                {isLive ? (
                  bidders.length > 0 ? (
                    <div className="grid gap-3">
                      {bidders.map((element, index) => (
                        <div
                          key={`${element.userName}-${index}`}
                          className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <img
                              src={element.profileImage || "/imageHolder.jpg"}
                              alt={element.userName}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">
                                {element.userName}
                              </p>
                              <p className="text-sm text-slate-500">
                                {getRank(index)} {element.isAutoBid ? "Auto" : ""}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-indigo-700">
                            {formatCurrency(element.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No bids have been placed yet." />
                  )
                ) : status === "Upcoming" ? (
                  <EmptyState text="This auction has not started yet." />
                ) : (
                  <EmptyState text="This auction has ended." />
                )}
              </div>

              <form
                onSubmit={handleBid}
                className="border-t border-slate-200 bg-slate-950 p-5"
              >
                {isLive ? (
                  isOwnAuction ? (
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <Gavel className="h-5 w-5 text-indigo-300" />
                      You cannot bid on your own auction.
                    </p>
                  ) : !isAuthenticated ? (
                    <div className="grid gap-4 rounded-md border border-white/10 bg-white/5 p-4 text-white">
                      <div>
                        <p className="text-lg font-semibold">Login to place a bid</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          You can inspect this auction publicly. Sign in with a bidder account to save it, get AI bid advice, and compete live.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Link
                          to="/login"
                          state={{ from: `${location.pathname}${location.search}` }}
                          className="inline-flex min-h-11 items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
                        >
                          Login to Bid
                        </Link>
                        <Link
                          to="/sign-up"
                          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
                        >
                          Create Bidder Account
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-md bg-white/5 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-300">
                            Current bid
                          </p>
                          <p className="mt-1 text-2xl font-bold text-white">
                            {formatCurrency(currentBid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-300">
                            Minimum next bid
                          </p>
                          <p className="mt-1 text-2xl font-bold text-indigo-200">
                            {formatCurrency(nextBid)}
                          </p>
                        </div>
                      </div>

                      {isBidder && (
                        <div className="fluid-stat-grid grid gap-3 rounded-md border border-white/10 bg-white/5 p-4">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                              <WalletIcon className="h-4 w-4 text-indigo-200" />
                              Available
                            </p>
                            <p className="mt-1 text-xl font-bold text-white">
                              {formatCurrency(walletAvailable)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-300">
                              Locked here
                            </p>
                            <p className="mt-1 text-xl font-bold text-indigo-100">
                              {formatCurrency(currentAuctionLock)}
                            </p>
                            {walletLocked > currentAuctionLock && (
                              <p className="mt-1 text-xs font-medium text-slate-400">
                                {formatCurrency(walletLocked)} locked total
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-300">
                              Additional lock
                            </p>
                            <p className="mt-1 text-xl font-bold text-indigo-100">
                              {formatCurrency(previewWalletRequirement.additionalLock)}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-400">
                              Power {formatCurrency(previewWalletRequirement.biddingPower)}
                            </p>
                          </div>
                          <div className="col-span-full flex flex-wrap gap-2">
                            <Link
                              to="/wallet#deposit"
                              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"
                            >
                              <WalletIcon className="h-4 w-4 text-indigo-600" />
                              Deposit
                            </Link>
                            <Link
                              to="/wallet#withdraw"
                              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                              Withdraw
                            </Link>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-white">
                            Bid Amount
                          </span>
                          <span className="flex items-center gap-2 rounded-md border border-white/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
                            <IndianRupee className="h-5 w-5 text-slate-400" />
                            <input
                              type="number"
                              inputMode="numeric"
                              min={nextBid}
                              className="min-w-0 flex-1 bg-transparent py-1 text-slate-950 outline-none"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder={String(nextBid)}
                              required
                            />
                          </span>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-white">
                            Auto-Bid Max
                          </span>
                          <span className="flex items-center gap-2 rounded-md border border-white/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
                            <IndianRupee className="h-5 w-5 text-slate-400" />
                            <input
                              type="number"
                              inputMode="numeric"
                              min={amount || nextBid}
                              className="min-w-0 flex-1 bg-transparent py-1 text-slate-950 outline-none"
                              value={maxAutoBid}
                              onChange={(e) => setMaxAutoBid(e.target.value)}
                            placeholder="Optional"
                          />
                        </span>
                      </label>
                      </div>

                      {isBidder && ownBidAmount > 0 && (
                        <div
                          className="grid gap-3 rounded-md border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Auto-bid control
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-400">
                                {myAutoBid?.active
                                  ? `Active up to ${formatCurrency(myAutoBid.maxAmount)}`
                                  : "No future auto-bids are active."}
                              </p>
                            </div>
                            {myAutoBid?.active && (
                              <button
                                type="button"
                                onClick={handleAutoBidCancel}
                                disabled={bidLoading}
                                className="inline-flex w-fit items-center gap-2 rounded-md border border-rose-300/40 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Ban className="h-4 w-4" />
                                Cancel auto-bid
                              </button>
                            )}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <span className="flex items-center gap-2 rounded-md border border-white/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
                              <IndianRupee className="h-5 w-5 text-slate-400" />
                              <input
                                type="number"
                                inputMode="numeric"
                                min={ownBidAmount + 1}
                                className="min-w-0 flex-1 bg-transparent py-1 text-slate-950 outline-none"
                                value={autoBidLimit}
                                onChange={(e) => setAutoBidLimit(e.target.value)}
                                placeholder={`Above ${ownBidAmount}`}
                              />
                            </span>
                            <button
                              type="button"
                              onClick={handleAutoBidUpdate}
                              disabled={!canUpdateAutoBid}
                              className="inline-flex min-h-11 items-center justify-center rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Update limit
                            </button>
                          </div>
                          <p className="text-xs font-medium text-slate-400">
                            Current bids stay active; this only changes future automatic increases.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {quickBids.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAmount(String(value))}
                            className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                          >
                            <TrendingUp className="h-4 w-4 text-indigo-200" />
                            Set {formatCurrency(value)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleBidAdvice}
                          disabled={aiActionLoading}
                          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Sparkles className="h-4 w-4" />
                          AI Bid Advice
                        </button>
                      </div>
                      <div className="grid gap-2">
                        <button
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                          type="submit"
                          disabled={!canSubmitBid}
                        >
                          <Gavel className="h-5 w-5" />
                          {bidLoading
                            ? "Placing bid..."
                            : `Place Bid${Number.isFinite(bidAmount) ? ` (${formatCurrency(bidAmount)})` : ""}`}
                        </button>
                        {bidValidationMessage && (
                          <p className="text-sm font-medium text-indigo-100" aria-live="polite">
                            {bidValidationMessage}
                            {isBidder && submitWalletRequirement.shortfall > 0 && (
                              <>
                                {" "}
                                <Link
                                  to="/wallet#deposit"
                                  className="font-bold text-white underline decoration-indigo-300 underline-offset-4"
                                >
                                  Add money
                                </Link>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      {bidAdvice && (
                        <div className="rounded-md border border-white/10 bg-white/5 p-4 text-white">
                          <p className="font-semibold">{bidAdvice.verdict}</p>
                          <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                            <span>Suggested {formatCurrency(bidAdvice.suggestedBid)}</span>
                            <span>Ceiling {formatCurrency(bidAdvice.ceilingBid)}</span>
                          </div>
                          <AiDarkList label="Reasons" items={bidAdvice.reasons} />
                          <AiDarkList label="Cautions" items={bidAdvice.cautions} />
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <p className="flex items-center gap-2 font-semibold text-white">
                    <Timer className="h-5 w-5 text-indigo-300" />
                    {status === "Upcoming"
                      ? "Auction has not started yet."
                      : "Auction has ended."}
                  </p>
                )}
              </form>
            </div>

            <SellerTrustPanel
              seller={auctionDetail.createdBy}
              quality={sellerQuality}
            />

            <div className="order-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6 2xl:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                  <List className="h-5 w-5 text-indigo-600" />
                  Description
                </h2>
                <button
                  type="button"
                  onClick={handleSummary}
                  disabled={aiActionLoading || !auctionDetail.title || !isAuthenticated}
                  className="inline-flex w-fit items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {!isAuthenticated
                    ? "Login for AI Summary"
                    : aiActionLoading
                      ? "Thinking..."
                      : "AI Summary"}
                </button>
              </div>
              {descriptionItems.length > 0 ? (
                <ul className="mt-4 grid gap-3 text-slate-600 md:grid-cols-2">
                  {descriptionItems.map((element) => (
                    <li key={element} className="rounded-md bg-slate-50 p-3 leading-7">
                      {element}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-slate-500">No description provided.</p>
              )}
              {auctionSummary && (
                <AiPanel title={auctionSummary.headline || "AI Auction Summary"}>
                  <AiList label="Key Points" items={auctionSummary.keyPoints} />
                  <AiList label="Missing Info" items={auctionSummary.missingInfo} />
                  <AiList label="Risk Notes" items={auctionSummary.riskNotes} />
                  <AiList label="Buyer Questions" items={auctionSummary.buyerQuestions} />
                </AiPanel>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const SellerTrustPanel = ({ seller, quality }) => {
  const badges = normalizeTrustBadges(quality, seller);
  const metrics = [
    ["Completed sales", quality?.completedSales || 0],
    ["Dispute rate", formatPercent(quality?.disputeRate)],
    ["Refund rate", formatPercent(quality?.refundRate)],
    ["Seller risk", quality?.riskLevel || "Low"],
  ];

  return (
    <aside className="order-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6 2xl:order-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-kicker">Seller Trust</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {seller?.userName || "PrimeBid seller"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {getSellerRiskSummary(quality)}
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-3 py-2 text-sm font-bold ${getSellerRiskClass(
            quality?.riskLevel
          )}`}
        >
          {quality?.riskLevel || "Low"} risk
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.id}
            className={`rounded-md border px-2.5 py-1 text-xs font-bold ${getTrustBadgeClass(
              badge.tone
            )}`}
            title={badge.description}
          >
            {badge.label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, value]) => (
          <Info key={label} label={label} value={value} />
        ))}
      </div>
    </aside>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-md bg-slate-50 p-3">
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
  </div>
);

const TrustNote = ({ icon: Icon, text, tone = "slate", title }) => (
  <div
    className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${getTrustBadgeClass(
      tone
    )}`}
    title={title}
  >
    <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
    <span>{text}</span>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="flex min-h-[240px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
    {text}
  </div>
);

const AiPanel = ({ title, children }) => (
  <div className="mt-5 grid gap-4 rounded-md border border-indigo-100 bg-indigo-50 p-4">
    <h3 className="font-semibold text-indigo-950">{title}</h3>
    <div className="grid gap-4 md:grid-cols-2">{children}</div>
  </div>
);

const AiList = ({ label, items = [] }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
      {label}
    </p>
    {items?.length ? (
      <ul className="mt-2 grid gap-2 text-sm text-indigo-950">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-white px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-indigo-800">None</p>
    )}
  </div>
);

const AiDarkList = ({ label, items = [] }) => (
  <div className="mt-3">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">
      {label}
    </p>
    {items?.length ? (
      <ul className="mt-2 grid gap-1 text-sm text-slate-200">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-slate-300">None</p>
    )}
  </div>
);

export default AuctionItem;
