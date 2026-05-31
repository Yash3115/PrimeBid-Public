/* eslint-disable react/prop-types */
import Card from "@/custom-components/Card";
import Spinner from "@/custom-components/Spinner";
import { useAuctionTicker } from "@/hooks/useAuctionTicker";
import { getAuctionStatus } from "@/lib/format";
import {
  BadgeIndianRupee,
  BellRing,
  Clock3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

const Auctions = () => {
  const {
    allAuctions,
    auctionListError,
    loading,
    serverTime,
    serverTimeReceivedAt,
  } = useSelector((state) => state.auction);
  const statusTick = useAuctionTicker();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("endingSoon");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setSortBy("endingSoon");
    setMinPrice("");
    setMaxPrice("");
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(allAuctions.map((auction) => auction.category).filter(Boolean))
      ).sort(),
    [allAuctions]
  );

  const statusSummary = useMemo(() => {
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
        return summary;
      },
      { All: allAuctions.length, Live: 0, Upcoming: 0, Ended: 0, Invalid: 0 }
    );
  }, [allAuctions, serverTime, serverTimeReceivedAt, statusTick]);

  const filteredAuctions = useMemo(() => {
    void statusTick;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...allAuctions]
      .filter((auction) => {
        const auctionPrice = Number(auction.currentBid || auction.startingBid || 0);
        const status = getAuctionStatus(
          auction,
          undefined,
          serverTime,
          serverTimeReceivedAt
        );
        const matchesStatus =
          statusFilter === "All" || status === statusFilter;
        const matchesCategory =
          categoryFilter === "All" || auction.category === categoryFilter;
        const searchableText = [
          auction.title,
          auction.description,
          auction.category,
          auction.condition,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch =
          !normalizedSearch || searchableText.includes(normalizedSearch);
        const matchesMin =
          minPrice === "" || auctionPrice >= Number(minPrice);
        const matchesMax =
          maxPrice === "" || auctionPrice <= Number(maxPrice);

        return matchesStatus && matchesCategory && matchesSearch && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === "priceHigh") {
          return Number(b.currentBid || b.startingBid || 0) - Number(a.currentBid || a.startingBid || 0);
        }
        if (sortBy === "priceLow") {
          return Number(a.currentBid || a.startingBid || 0) - Number(b.currentBid || b.startingBid || 0);
        }
        return new Date(a.endTime || 0) - new Date(b.endTime || 0);
      });
  }, [
    allAuctions,
    categoryFilter,
    maxPrice,
    minPrice,
    searchTerm,
    serverTime,
    serverTimeReceivedAt,
    sortBy,
    statusFilter,
    statusTick,
  ]);

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "All" ||
    categoryFilter !== "All" ||
    sortBy !== "endingSoon" ||
    minPrice ||
    maxPrice;

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <article className="app-page">
          <section className="app-container">
            <div className="page-header mb-4 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <p className="app-kicker">
                  Marketplace
                </p>
                <h1 className="app-title">
                  Auctions
                </h1>
                <p className="app-subtitle">
                  Search live, upcoming, and completed listings with wallet-aware bid context and clear timing signals.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                <MarketplaceStat
                  icon={Clock3}
                  label="Live now"
                  value={statusSummary.Live}
                  tone="emerald"
                />
                <MarketplaceStat
                  icon={SlidersHorizontal}
                  label="Upcoming"
                  value={statusSummary.Upcoming}
                  tone="amber"
                />
                <MarketplaceStat
                  icon={BadgeIndianRupee}
                  label="Lots"
                  value={allAuctions.length}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, description, category..."
                  className="min-w-0 flex-1 bg-transparent py-1 outline-none"
                />
              </label>

              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All", "Live", "Upcoming", "Ended"]}
              />
              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={["All", ...categories]}
              />
              <FilterSelect
                label="Sort"
                value={sortBy}
                onChange={setSortBy}
                options={[
                  ["endingSoon", "Ending soon"],
                  ["newest", "Newest"],
                  ["priceHigh", "Highest bid"],
                  ["priceLow", "Lowest bid"],
                ]}
              />
              <div className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-4">
                <PriceInput
                  label="Min price"
                  value={minPrice}
                  onChange={setMinPrice}
                />
                <PriceInput
                  label="Max price"
                  value={maxPrice}
                  onChange={setMaxPrice}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 xl:col-span-4">
                <div className="flex flex-wrap gap-2" aria-label="Quick status filters">
                  {["All", "Live", "Upcoming", "Ended"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                        statusFilter === status
                          ? "bg-slate-950 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {status} ({statusSummary[status] || 0})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                    {filteredAuctions.length} of {allAuctions.length} shown
                  </span>
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
            ) : allAuctions.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
                No auctions are available right now.
              </div>
            ) : filteredAuctions.length === 0 ? (
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
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredAuctions.map((element) => (
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
                    id={element._id}
                    key={element._id}
                  />
                ))}
              </div>
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
      onChange={(e) => onChange(e.target.value)}
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
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      placeholder="Any"
    />
  </label>
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
