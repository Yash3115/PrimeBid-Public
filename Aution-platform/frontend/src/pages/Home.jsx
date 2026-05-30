import { formatCurrency, getAuctionStatus } from "@/lib/format";
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

  return (
    <>
      <section className="app-page">
        <div className="app-container flex flex-col gap-12">
          <div className="grid gap-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-10 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <p className="app-kicker mb-4">
                Transparent auctions, cleaner outcomes
              </p>
              <h1 className="mb-4 text-4xl font-bold leading-tight text-slate-950 min-[480px]:text-5xl md:text-6xl xl:text-7xl">
                PrimeBid
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Discover active auctions, track upcoming lots, and manage
                bidding from one focused marketplace.
              </p>
              <div className="my-8 flex flex-wrap gap-3">
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/sign-up"
                      className="rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white transition duration-200 hover:bg-indigo-700"
                    >
                      Sign Up
                    </Link>
                    <Link
                      to={"/login"}
                      className="rounded-md border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition duration-200 hover:border-indigo-300 hover:text-indigo-700"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="flex flex-col gap-5">
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
                    <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-sm font-bold text-indigo-700">
                      {index + 1}
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
