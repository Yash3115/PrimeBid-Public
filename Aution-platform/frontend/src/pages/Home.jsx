import { formatCurrency, formatDateTime, getAuctionStatus } from "@/lib/format";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Gavel,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import FeaturedAuctions from "./home-sub-components/FeaturedAuctions";
import UpcomingAuctions from "./home-sub-components/UpcomingAuctions";
import Leaderboard from "./home-sub-components/Leaderboard";

const Home = () => {
  const howItWorks = [
    {
      title: "Post Items",
      description: "Auctioneers list items with bid windows and starting prices.",
    },
    {
      title: "Place Bids",
      description: "Bidders compete in real time before the auction closes.",
    },
    {
      title: "Win Notification",
      description: "The highest bidder is notified when the auction ends.",
    },
    {
      title: "Wallet Settlement",
      description:
        "Winning bid funds are captured from the bidder wallet and platform fees are deducted automatically.",
    },
  ];

  const { isAuthenticated, leaderboard } = useSelector((state) => state.user);
  const { allAuctions, serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const liveAuctions = allAuctions.filter(
    (auction) =>
      getAuctionStatus(auction, undefined, serverTime, serverTimeReceivedAt) ===
      "Live"
  ).length;
  const upcomingAuctions = allAuctions.filter(
    (auction) =>
      getAuctionStatus(auction, undefined, serverTime, serverTimeReceivedAt) ===
      "Upcoming"
  ).length;
  const totalBidVolume = leaderboard.reduce(
    (total, bidder) => total + Number(bidder.moneySpent || bidder.moneyspend || 0),
    0
  );
  const marketplaceStats = [
    ["Live auctions", liveAuctions, "Open for bidding now"],
    ["Upcoming", upcomingAuctions, "Scheduled future listings"],
    ["Total lots", allAuctions.length, "Published auction items"],
    ["Bid volume", formatCurrency(totalBidVolume), "Tracked winner spend"],
  ];
  const highlightedAuctions = [...allAuctions]
    .filter(
      (auction) =>
        getAuctionStatus(auction, undefined, serverTime, serverTimeReceivedAt) !==
        "Ended"
    )
    .sort((a, b) => new Date(a.endTime || 0) - new Date(b.endTime || 0))
    .slice(0, 3);
  const heroAuction = highlightedAuctions[0] || allAuctions[0];
  const heroStatus = heroAuction
    ? getAuctionStatus(heroAuction, undefined, serverTime, serverTimeReceivedAt)
    : "Live";
  const trustSignals = [
    [ShieldCheck, "KYC seller review"],
    [WalletCards, "Wallet-backed bidding"],
    [BadgeCheck, "Automatic settlement"],
    [Clock3, "Visible auction timing"],
  ];

  return (
    <>
      <section className="app-page">
        <div className="app-container flex flex-col gap-8">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch">
            <div className="page-header flex min-h-[440px] flex-col justify-between overflow-hidden bg-slate-950 p-0 text-white">
              <div className="grid gap-6 p-5 sm:p-6 md:p-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div className="min-w-0">
                  <p className="max-w-xs text-xs font-bold uppercase leading-5 text-indigo-200 tracking-[0.14em]">
                    Trusted auction marketplace
                  </p>
                  <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
                    PrimeBid
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                    Browse live lots, understand the next bid, and participate
                    with wallet-backed confidence from one focused marketplace.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/auctions"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-indigo-50"
                    >
                      <Search className="h-5 w-5 text-indigo-600" />
                      Browse Auctions
                    </Link>
                    {!isAuthenticated ? (
                      <Link
                        to="/sign-up"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/10"
                      >
                        Create Account
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    ) : (
                      <Link
                        to="/dashboard"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/10"
                      >
                        Open Dashboard
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                </div>

                {heroAuction && (
                  <Link
                    to={`/auction/item/${heroAuction._id}`}
                    className="group overflow-hidden rounded-lg border border-white/10 bg-white/10 shadow-2xl shadow-slate-950/30 transition hover:bg-white/15"
                  >
                    <div className="relative aspect-[4/3] bg-slate-800">
                      <img
                        src={heroAuction.image?.url || "/imageHolder.jpg"}
                        alt={heroAuction.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="status-pill absolute left-3 top-3 border-emerald-200 bg-emerald-50 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {heroStatus}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-2 text-xl font-bold leading-snug text-white">
                        {heroAuction.title}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md bg-white/10 p-3">
                          <p className="text-xs font-semibold text-slate-300">
                            Current bid
                          </p>
                          <p className="mt-1 text-xl font-bold">
                            {formatCurrency(
                              heroAuction.currentBid || heroAuction.startingBid
                            )}
                          </p>
                        </div>
                        <div className="rounded-md bg-white/10 p-3">
                          <p className="text-xs font-semibold text-slate-300">
                            Ends
                          </p>
                          <p className="mt-1 text-sm font-bold leading-6">
                            {formatDateTime(heroAuction.endTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
              <div className="grid border-t border-white/10 bg-white/[0.04] sm:grid-cols-2 xl:grid-cols-4">
                {trustSignals.map(([Icon, label]) => (
                  <div
                    key={label}
                    className="flex min-h-14 items-center gap-3 border-t border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 first:border-t-0 sm:border-l sm:first:border-l-0 sm:[&:nth-child(2)]:border-t-0 xl:border-t-0"
                  >
                    <Icon className="h-5 w-5 text-indigo-200" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <aside className="page-panel grid content-between gap-4">
              <div>
                <p className="app-kicker">Market Snapshot</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Auction activity at a glance
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              {marketplaceStats.map(([title, value, description]) => (
                <div
                  key={title}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
              </div>
              {highlightedAuctions.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-sm font-bold text-slate-950">
                    Closing queue
                  </p>
                  {highlightedAuctions.map((auction) => (
                    <Link
                      key={auction._id}
                      to={`/auction/item/${auction._id}`}
                      className="grid gap-3 rounded-md border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50 sm:grid-cols-[56px_1fr_auto] sm:items-center"
                    >
                      <img
                        src={auction.image?.url || "/imageHolder.jpg"}
                        alt={auction.title}
                        className="h-14 w-14 rounded-md object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-950">
                          {auction.title}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(auction.endTime)}
                        </span>
                      </span>
                      <span className="w-fit rounded-md bg-indigo-50 px-2.5 py-1.5 text-sm font-bold text-indigo-700">
                        {formatCurrency(auction.currentBid || auction.startingBid)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>

          <div className="grid gap-5">
            <h3 className="text-2xl font-semibold text-slate-950 md:text-3xl">
              How it works
            </h3>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {howItWorks.map((element, index) => {
                return (
                  <div
                    key={element.title}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                      {index === 0 ? <Gavel className="h-5 w-5" /> : index + 1}
                    </span>
                    <h5 className="font-bold text-slate-950">
                      {element.title}
                    </h5>
                    <p className="mt-2 leading-6 text-slate-600">
                      {element.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <FeaturedAuctions />
          <UpcomingAuctions />
          <Leaderboard />
        </div>
      </section>
    </>
  );
};

export default Home;
