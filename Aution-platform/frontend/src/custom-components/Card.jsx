import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { formatCurrency, getAuctionCountdown, getAuctionStatus } from "@/lib/format";
import {
  getTrustBadgeClass,
  normalizeTrustBadges,
} from "@/lib/sellerQuality";
import { addToWatchlist, removeFromWatchlist } from "@/store/slices/userSlice";

/* eslint-disable react/prop-types */
const statusClass = {
  Live: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  Upcoming: "border border-amber-200 bg-amber-50 text-amber-700",
  Ended: "border border-slate-200 bg-slate-100 text-slate-600",
  Invalid: "border border-red-200 bg-red-50 text-red-700",
};

const Card = ({
  imgSrc,
  title,
  startingBid,
  currentBid,
  category,
  startTime,
  endTime,
  runtimeStatus,
  auctionServerTime,
  createdBy,
  sellerQuality,
  id,
}) => {
  const { serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const auctionTime = useMemo(
    () => ({ startTime, endTime, runtimeStatus, serverTime: auctionServerTime }),
    [auctionServerTime, endTime, runtimeStatus, startTime]
  );
  const [timeLeft, setTimeLeft] = useState(() =>
    getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
  );
  const status = getAuctionStatus(
    auctionTime,
    undefined,
    serverTime,
    serverTimeReceivedAt
  );
  const dispatch = useDispatch();
  const { isAuthenticated, user, watchlist, watchlistLoading } = useSelector(
    (state) => state.user
  );
  const createdById = createdBy?._id || createdBy;
  const isOwnAuction = createdById?.toString?.() === user?._id?.toString?.();
  const isSaved = watchlist.some((auction) => auction._id === id);

  useEffect(() => {
    setTimeLeft(
      getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
    );
    const timer = setInterval(() => {
      setTimeLeft(
        getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [auctionTime, serverTime, serverTimeReceivedAt]);

  const formatTimeLeft = ({ days, hours, minutes, seconds }) => {
    const pad = (num) => String(num).padStart(2, "0");
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const latestBid = Number(currentBid || startingBid || 0);
  const trustBadges = normalizeTrustBadges(sellerQuality, createdBy).slice(0, 2);
  const handleWatchlist = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSaved) {
      dispatch(removeFromWatchlist(id));
    } else {
      dispatch(addToWatchlist(id));
    }
  };

  return (
    <article className="app-card app-card-hover group relative flex min-h-[360px] flex-col overflow-hidden">
      {isAuthenticated && !isOwnAuction && (
        <button
          type="button"
          onClick={handleWatchlist}
          disabled={watchlistLoading}
          aria-pressed={isSaved}
          className={`absolute right-3 top-3 z-10 rounded-md p-2 shadow-sm ring-1 ring-slate-200/70 transition ${
            isSaved
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
              : "bg-white/95 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          aria-label={isSaved ? "Remove from watchlist" : "Save to watchlist"}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
        </button>
      )}
      <Link
        to={`/auction/item/${id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc || "/imageHolder.jpg"}
          alt={title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute left-3 top-3 rounded-md px-3 py-1 text-xs font-semibold shadow-sm ${
            statusClass[status] || statusClass.Invalid
          }`}
        >
          {status}
        </span>
        {category && (
          <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {category}
          </span>
        )}
      </div>
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <Link to={`/auction/item/${id}`} className="focus:outline-none">
          <h5 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-950 group-hover:text-indigo-600">
            {title}
          </h5>
        </Link>
        <div className="space-y-3">
          <div className="grid gap-3 min-[380px]:grid-cols-2">
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Current
              <span className="block break-words text-lg font-bold leading-tight text-slate-950">
                {formatCurrency(latestBid)}
              </span>
            </p>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Starting
              <span className="block break-words text-lg font-bold leading-tight text-slate-950">
                {formatCurrency(startingBid)}
              </span>
            </p>
          </div>
          <p className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
            {Object.keys(timeLeft).length > 1
              ? `${timeLeft.type}: ${formatTimeLeft(timeLeft)}`
              : "Time's up!"}
          </p>
          <div className="flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
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
        </div>
      </div>
    </article>
  );
};

export default Card;
