/* eslint-disable react/prop-types */
import Card from "@/custom-components/Card";
import Spinner from "@/custom-components/Spinner";
import { useAuctionTicker } from "@/hooks/useAuctionTicker";
import { AUCTION_CATEGORIES, AUCTION_CONDITIONS } from "@/lib/auctionOptions";
import { getAuctionStatus } from "@/lib/format";
import {
  MARKETPLACE_DEFAULTS,
  MARKETPLACE_SORT_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  clearMarketplaceSearchParams,
  marketplaceQueryFromSearchParams,
  marketplaceQueryToApiParams,
  setMarketplaceSearchParam,
} from "@/lib/marketplaceQuery";
import { getAllAuctionItems } from "@/store/slices/auctionSlice";
import {
  BadgeIndianRupee,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

const Auctions = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    allAuctions,
    auctionFacets,
    auctionListError,
    auctionPagination,
    loading,
    serverTime,
    serverTimeReceivedAt,
  } = useSelector((state) => state.auction);
  const statusTick = useAuctionTicker();
  const query = useMemo(
    () => marketplaceQueryFromSearchParams(searchParams),
    [searchParams]
  );
  const apiParams = useMemo(() => marketplaceQueryToApiParams(query), [query]);
  const [searchDraft, setSearchDraft] = useState(query.q);

  useEffect(() => {
    dispatch(getAllAuctionItems(apiParams));
  }, [apiParams, dispatch]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  useEffect(() => {
    if (searchDraft === query.q) return undefined;
    const timer = setTimeout(() => {
      setSearchParams(
        setMarketplaceSearchParam(searchParams, "q", searchDraft, {
          resetPage: true,
        }),
        { replace: true }
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [query.q, searchDraft, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      !loading &&
      auctionPagination?.totalPages &&
      query.page > auctionPagination.totalPages
    ) {
      setSearchParams(
        setMarketplaceSearchParam(
          searchParams,
          "page",
          auctionPagination.totalPages,
          { resetPage: false }
        ),
        { replace: true }
      );
    }
  }, [
    auctionPagination?.totalPages,
    loading,
    query.page,
    searchParams,
    setSearchParams,
  ]);

  const setParam = (key, value, options) => {
    setSearchParams(
      setMarketplaceSearchParam(searchParams, key, value, options),
      { replace: false }
    );
  };

  const resetFilters = () => {
    setSearchDraft("");
    setSearchParams(clearMarketplaceSearchParams(), { replace: false });
  };

  const refreshAuctions = () => {
    dispatch(getAllAuctionItems(apiParams));
  };

  const fallbackStatusSummary = useMemo(() => {
    void statusTick;
    return allAuctions.reduce(
      (summary, auction) => {
        const status = getAuctionStatus(
          auction,
          undefined,
          serverTime,
          serverTimeReceivedAt
        );
        summary[status] = (summary[status] || 0) + 1;
        summary.All += 1;
        return summary;
      },
      { All: 0, Live: 0, Upcoming: 0, Ended: 0, Invalid: 0 }
    );
  }, [allAuctions, serverTime, serverTimeReceivedAt, statusTick]);

  const statusSummary =
    auctionFacets?.statusCounts || fallbackStatusSummary;
  const categories =
    auctionFacets?.categories?.length > 0
      ? auctionFacets.categories
      : AUCTION_CATEGORIES;
  const conditions =
    auctionFacets?.conditions?.length > 0
      ? auctionFacets.conditions
      : AUCTION_CONDITIONS;
  const totalItems = Number(
    auctionPagination?.totalItems ?? statusSummary.All ?? allAuctions.length
  );
  const currentPage = Number(auctionPagination?.page || query.page || 1);
  const totalPages = Number(auctionPagination?.totalPages || 1);
  const pageLimit = Number(auctionPagination?.limit || query.limit || 12);
  const pageStart =
    totalItems > 0 ? (currentPage - 1) * pageLimit + 1 : 0;
  const pageEnd =
    totalItems > 0
      ? Math.min(currentPage * pageLimit, totalItems)
      : 0;
  const hasActiveFilters =
    query.q ||
    query.status !== MARKETPLACE_DEFAULTS.status ||
    query.category !== MARKETPLACE_DEFAULTS.category ||
    query.condition !== MARKETPLACE_DEFAULTS.condition ||
    query.sort !== MARKETPLACE_DEFAULTS.sort ||
    query.minPrice ||
    query.maxPrice;
  const showInitialSpinner = loading && allAuctions.length === 0;

  return (
    <>
      {showInitialSpinner ? (
        <Spinner />
      ) : (
        <article className="app-page">
          <section className="app-container">
            <div className="page-header mb-4 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <p className="app-kicker">Marketplace</p>
                <h1 className="app-title">Auctions</h1>
                <p className="app-subtitle">
                  Search live, upcoming, and completed listings with server-side
                  filters, shareable URLs, and clear wallet-backed bid context.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                <MarketplaceStat
                  icon={Clock3}
                  label="Live now"
                  value={statusSummary.Live || 0}
                  tone="emerald"
                />
                <MarketplaceStat
                  icon={SlidersHorizontal}
                  label="Upcoming"
                  value={statusSummary.Upcoming || 0}
                  tone="amber"
                />
                <MarketplaceStat
                  icon={BadgeIndianRupee}
                  label="Lots"
                  value={statusSummary.All || totalItems}
                  tone="indigo"
                />
              </div>
            </div>

            <div className="trust-strip mb-6">
              <TrustItem icon={ShieldCheck} text="KYC-gated seller tools" />
              <TrustItem icon={WalletCards} text="Wallet-backed bid holds" />
              <TrustItem icon={Clock3} text="Live timing and status" />
              <TrustItem icon={BellRing} text="Watchlist and outbid alerts" />
            </div>

            <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] xl:grid-cols-[1fr_auto_auto_auto]">
              <label className="flex min-w-0 items-center gap-3 rounded-md border border-slate-300 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <span className="sr-only">Search auctions</span>
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search title, description, category..."
                  className="min-w-0 flex-1 bg-transparent py-1 outline-none"
                />
              </label>

              <FilterSelect
                label="Status"
                value={query.status}
                onChange={(value) => setParam("status", value)}
                options={MARKETPLACE_STATUS_OPTIONS}
              />
              <FilterSelect
                label="Category"
                value={query.category}
                onChange={(value) => setParam("category", value)}
                options={["All", ...categories]}
              />
              <FilterSelect
                label="Sort"
                value={query.sort}
                onChange={(value) => setParam("sort", value)}
                options={MARKETPLACE_SORT_OPTIONS}
              />
              <div className="grid gap-3 md:col-span-2 md:grid-cols-3 xl:col-span-4">
                <FilterSelect
                  label="Condition"
                  value={query.condition}
                  onChange={(value) => setParam("condition", value)}
                  options={["All", ...conditions]}
                />
                <PriceInput
                  label="Min price"
                  value={query.minPrice}
                  onChange={(value) => setParam("minPrice", value)}
                />
                <PriceInput
                  label="Max price"
                  value={query.maxPrice}
                  onChange={(value) => setParam("maxPrice", value)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 xl:col-span-4">
                <div className="flex flex-wrap gap-2" aria-label="Quick status filters">
                  {MARKETPLACE_STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setParam("status", status)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                        query.status === status
                          ? "bg-slate-950 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {status} ({statusSummary[status] || 0})
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                    {pageStart}-{pageEnd} of {totalItems} shown
                  </span>
                  <button
                    type="button"
                    onClick={refreshAuctions}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {auctionListError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
                <h2 className="text-xl font-semibold">
                  Marketplace temporarily unavailable.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6">
                  {auctionListError}
                </p>
              </div>
            ) : totalItems === 0 && !hasActiveFilters ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
                No auctions are available right now.
              </div>
            ) : allAuctions.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <SlidersHorizontal className="mb-3 h-7 w-7 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-950">
                  No auctions match these filters.
                </h2>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {allAuctions.map((element) => (
                    <Card
                      title={element.title}
                      startTime={element.startTime}
                      endTime={element.endTime}
                      imgSrc={element.image?.url}
                      startingBid={element.startingBid}
                      currentBid={element.currentBid}
                      category={element.category}
                      description={element.description}
                      minimumBidIncrement={element.minimumBidIncrement}
                      bidCount={element.bids?.length || 0}
                      runtimeStatus={element.runtimeStatus}
                      auctionServerTime={element.serverTime}
                      createdBy={element.createdBy}
                      sellerQuality={element.sellerQuality}
                      id={element._id}
                      key={element._id}
                    />
                  ))}
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hasPrevPage={auctionPagination?.hasPrevPage}
                  hasNextPage={auctionPagination?.hasNextPage}
                  onPageChange={(page) =>
                    setParam("page", page, { resetPage: false })
                  }
                />
              </>
            )}
          </section>
        </article>
      )}
    </>
  );
};

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="grid min-w-[170px] gap-1">
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
    >
      {options.map((option) => {
        const optionValue = Array.isArray(option) ? option[0] : option;
        const optionLabel = Array.isArray(option) ? option[1] : option;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  </label>
);

const PriceInput = ({ label, value, onChange }) => (
  <label className="grid gap-1">
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      placeholder="Any"
    />
  </label>
);

const PaginationControls = ({
  currentPage,
  totalPages,
  hasPrevPage,
  hasNextPage,
  onPageChange,
}) => (
  <nav
    className="mt-8 flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
    aria-label="Auction pages"
  >
    <p className="text-sm font-semibold text-slate-600">
      Page {currentPage} of {totalPages}
    </p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!hasPrevPage}
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>
      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  </nav>
);

const MarketplaceStat = ({ icon: Icon, label, value, tone }) => {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    indigo: "bg-indigo-50 text-indigo-700",
  }[tone];

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <span className={`rounded-md p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
};

const TrustItem = ({ icon: Icon, text }) => (
  <div className="trust-item">
    <Icon className="h-5 w-5 shrink-0 text-indigo-600" />
    <span>{text}</span>
  </div>
);

export default Auctions;
