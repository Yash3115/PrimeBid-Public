/* eslint-disable react/prop-types */
import Card from "@/custom-components/Card";
import Spinner from "@/custom-components/Spinner";
import { useAuctionTicker } from "@/hooks/useAuctionTicker";
import { getAuctionStatus } from "@/lib/format";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

const Auctions = () => {
  const { allAuctions, loading, serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const statusTick = useAuctionTicker();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("endingSoon");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(allAuctions.map((auction) => auction.category).filter(Boolean))
      ).sort(),
    [allAuctions]
  );

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

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <article className="app-page">
          <section className="app-container">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="app-kicker">
                  Marketplace
                </p>
                <h1 className="app-title">
                  Auctions
                </h1>
              </div>
              <div className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                {filteredAuctions.length} of {allAuctions.length} shown
              </div>
            </div>

            <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1fr_auto_auto_auto]">
              <label className="flex min-w-0 items-center gap-3 rounded-md border border-slate-300 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
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
            </div>

            {allAuctions.length === 0 ? (
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
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                    setCategoryFilter("All");
                    setSortBy("endingSoon");
                    setMinPrice("");
                    setMaxPrice("");
                  }}
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

export default Auctions;
