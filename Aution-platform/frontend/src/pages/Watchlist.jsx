import Card from "@/custom-components/Card";
import Spinner from "@/custom-components/Spinner";
import { Heart, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { fetchWatchlist } from "@/store/slices/userSlice";
import { getSmartRecommendations } from "@/store/slices/auctionSlice";

const Watchlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { authChecked, isAuthenticated, watchlist, watchlistLoading } =
    useSelector((state) => state.user);
  const { smartRecommendations } = useSelector((state) => state.auction);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    dispatch(fetchWatchlist());
    dispatch(getSmartRecommendations());
  }, [authChecked, dispatch, isAuthenticated, navigate]);

  const filteredWatchlist = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return watchlist;
    return watchlist.filter((auction) =>
      [auction.title, auction.description, auction.category, auction.condition]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm, watchlist]);

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-kicker">
              Saved auctions
            </p>
            <h1 className="app-title">
              Watchlist
            </h1>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-md bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
            <Heart className="h-4 w-4 fill-current" />
            {watchlist.length} saved
          </div>
        </div>

        <label className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
          <span className="sr-only">Search saved auctions</span>
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved auctions..."
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>

        {!authChecked || watchlistLoading ? (
          <Spinner />
        ) : filteredWatchlist.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredWatchlist.map((auction) => (
              <Card
                key={auction._id}
                id={auction._id}
                title={auction.title}
                imgSrc={auction.image?.url}
                startTime={auction.startTime}
                endTime={auction.endTime}
                startingBid={auction.startingBid}
                currentBid={auction.currentBid}
                category={auction.category}
                runtimeStatus={auction.runtimeStatus}
                auctionServerTime={auction.serverTime}
                createdBy={auction.createdBy}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              No saved auctions yet.
            </h2>
            <p className="mt-2 text-slate-600">
              Save auctions from the marketplace to follow them here.
            </p>
            <Link
              to="/auctions"
              className="mt-5 inline-flex rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Browse Auctions
            </Link>
          </div>
        )}

        {authChecked && smartRecommendations.length > 0 && (
          <div className="mt-10">
            <div className="mb-4">
              <p className="app-kicker">
                Smart picks
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Similar Auctions
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {smartRecommendations.map((auction) => (
                <Card
                  key={auction._id}
                  id={auction._id}
                  title={auction.title}
                  imgSrc={auction.image?.url}
                  startTime={auction.startTime}
                  endTime={auction.endTime}
                  startingBid={auction.startingBid}
                  currentBid={auction.currentBid}
                  category={auction.category}
                  runtimeStatus={auction.runtimeStatus}
                  auctionServerTime={auction.serverTime}
                  createdBy={auction.createdBy}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Watchlist;
