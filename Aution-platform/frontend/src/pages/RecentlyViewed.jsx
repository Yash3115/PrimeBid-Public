import Card from "@/custom-components/Card";
import { Clock3, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "primebid_recently_viewed";

const RecentlyViewed = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const clearRecent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-kicker">
              Browsing history
            </p>
            <h1 className="app-title">
              Recently Viewed
            </h1>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearRecent}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((auction) => (
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
                description={auction.description}
                minimumBidIncrement={auction.minimumBidIncrement}
                bidCount={auction.bids?.length || 0}
                runtimeStatus={auction.runtimeStatus}
                auctionServerTime={auction.serverTime}
                createdBy={auction.createdBy}
                sellerQuality={auction.sellerQuality}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <Clock3 className="mx-auto h-8 w-8 text-indigo-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              No recently viewed auctions yet.
            </h2>
            <p className="mt-2 text-slate-600">
              Auctions you open will appear here for quick return visits.
            </p>
            <Link
              to="/auctions"
              className="mt-5 inline-flex rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Browse Auctions
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecentlyViewed;
