import ActionCenter from "@/custom-components/ActionCenter";
import AuctionImage from "@/custom-components/AuctionImage";
import Spinner from "@/custom-components/Spinner";
import {
  buildBidderNextActions,
  getWinnerNextAction,
} from "@/lib/actionInsights";
import { filterActionableBidLocks } from "@/lib/dashboardUi";
import { formatCurrency, formatDateTime, getAuctionStatus } from "@/lib/format";
import { getAllAuctionItems, getSmartRecommendations } from "@/store/slices/auctionSlice";
import { fetchWatchlist, fetchWonAuctions } from "@/store/slices/userSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  Eye,
  Gavel,
  Heart,
  Sparkles,
  Trophy,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */
const sameId = (left, right) => left?.toString?.() === right?.toString?.();

const BidderDashboard = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const {
    authChecked,
    isAuthenticated,
    user,
    watchlist,
    watchlistLoading,
    wonAuctions,
  } = useSelector((state) => state.user);
  const {
    allAuctions,
    loading: auctionLoading,
    serverTime,
    serverTimeReceivedAt,
    smartRecommendations,
  } = useSelector((state) => state.auction);
  const { loading: walletLoading, lockBreakdown, wallet, withdrawals } =
    useSelector((state) => state.wallet);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Bidder") {
      navigateTo("/");
      return;
    }

    dispatch(fetchWallet());
    dispatch(fetchWatchlist());
    dispatch(fetchWonAuctions());
    dispatch(getAllAuctionItems());
    dispatch(getSmartRecommendations());
  }, [authChecked, dispatch, isAuthenticated, navigateTo, user.role]);

  const dashboardLoading = !authChecked || walletLoading || auctionLoading;
  const availableBalance = Number(wallet.availableBalance || 0);
  const lockedBalance = Number(wallet.lockedBalance || 0);
  const rawBidLocks = lockBreakdown?.bidLocks;
  const bidLocks = useMemo(() => rawBidLocks || [], [rawBidLocks]);
  const withdrawalLocks = lockBreakdown?.withdrawalLocks || [];
  const pendingWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.status === "Pending"
  );

  const bidderAuctions = useMemo(
    () =>
      allAuctions.filter((auction) =>
        (auction.bids || []).some((bid) => sameId(bid.userId, user?._id))
      ),
    [allAuctions, user?._id]
  );

  const outbidAuctions = useMemo(
    () =>
      bidderAuctions
        .filter((auction) => {
          const status = getAuctionStatus(
            auction,
            undefined,
            serverTime,
            serverTimeReceivedAt
          );
          return (
            status === "Live" &&
            auction.highestBidder &&
            !sameId(auction.highestBidder, user?._id)
          );
        })
        .slice(0, 4),
    [bidderAuctions, serverTime, serverTimeReceivedAt, user?._id]
  );

  const watchlistEndingSoon = useMemo(
    () =>
      [...watchlist]
        .filter((auction) => {
          const status = getAuctionStatus(
            auction,
            undefined,
            serverTime,
            serverTimeReceivedAt
          );
          return status === "Live" || status === "Upcoming";
        })
        .sort((a, b) => new Date(a.endTime) - new Date(b.endTime))
        .slice(0, 4),
    [serverTime, serverTimeReceivedAt, watchlist]
  );

  const activeBidLocks = useMemo(
    () => filterActionableBidLocks(bidLocks),
    [bidLocks]
  );
  const leadingLocks = activeBidLocks.slice(0, 4);
  const recommendations = smartRecommendations.slice(0, 4);
  const nextActions = buildBidderNextActions({
    availableBalance,
    bidLocks: activeBidLocks,
    outbidAuctions,
    pendingWithdrawals,
    wonAuctions,
  });
  const actionItems = [
    {
      label: "Active holds",
      value: leadingLocks.length,
      detail: "Live bids currently locking wallet funds",
      icon: Gavel,
    },
    {
      label: "Outbid",
      value: outbidAuctions.length,
      detail: "Live auctions needing a higher bid",
      icon: Clock3,
    },
    {
      label: "Watchlist",
      value: watchlistEndingSoon.length,
      detail: "Saved live or upcoming auctions",
      icon: Heart,
    },
    {
      label: "Won",
      value: wonAuctions.length,
      detail: "Completed wins and seller handoffs",
      icon: Trophy,
    },
  ];

  return (
    <section className="app-page">
      <div className="app-container grid gap-6">
        <div className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="app-kicker">
              Bidder Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">
              Actionable bids and won-auction handoffs
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              See live holds, auctions that need a response, saved auctions
              that are still relevant, and post-win delivery tasks.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/wallet#deposit"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
              >
                <ArrowDownToLine className="h-5 w-5" />
                Deposit
              </Link>
              <Link
                to="/wallet#withdraw"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <ArrowUpFromLine className="h-5 w-5" />
                Withdraw
              </Link>
              <Link
                to="/auctions"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Eye className="h-5 w-5" />
                Browse Auctions
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Wallet available
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-950">
                  {formatCurrency(availableBalance)}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <WalletIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Locked" value={formatCurrency(lockedBalance)} />
              <MiniMetric
                label="Pending withdrawals"
                value={pendingWithdrawals.length}
              />
            </div>
          </div>
        </div>

        {dashboardLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {actionItems.map(({ icon: Icon, label, value, detail }) => (
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
              title="Next Best Actions"
              emptyTitle="You are all caught up"
              emptyText="No urgent bids, wallet holds, or winner handoffs need action right now."
              actions={nextActions}
            />

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel
                title="Active Bid Holds"
                action={{ label: "Wallet", to: "/wallet" }}
              >
                {leadingLocks.length > 0 ? (
                  <div className="grid gap-3">
                    {leadingLocks.map((lock) => (
                      <AuctionRow
                        key={lock.bidId}
                        image={lock.image?.url}
                        title={lock.title}
                        subtitle={`${lock.runtimeStatus} - locked ${formatCurrency(
                          lock.amount
                        )}`}
                        value={formatCurrency(lock.bidAmount)}
                        to={`/auction/item/${lock.auctionId}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No live bid holds"
                    text="Ended bid history stays in wallet transactions and notifications so this dashboard stays focused."
                    action={{ label: "Find Live Auctions", to: "/auctions" }}
                  />
                )}
              </Panel>

              <Panel
                title="Needs Attention"
                action={{ label: "Watchlist", to: "/watchlist" }}
              >
                <div className="grid gap-3">
                  {outbidAuctions.map((auction) => (
                    <AuctionRow
                      key={auction._id}
                      image={auction.image?.url}
                      title={auction.title}
                      subtitle="You have been outbid"
                      value={formatCurrency(auction.currentBid)}
                      to={`/auction/item/${auction._id}`}
                      tone="rose"
                    />
                  ))}
                  {withdrawalLocks.map((lock) => (
                    <div
                      key={lock.withdrawalId}
                      className="rounded-md border border-amber-100 bg-amber-50 p-4"
                    >
                      <p className="font-semibold text-slate-950">
                        Withdrawal in review
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCurrency(lock.amount)} to{" "}
                        {lock.bankName || "bank account"}
                      </p>
                    </div>
                  ))}
                  {outbidAuctions.length === 0 &&
                    withdrawalLocks.length === 0 && (
                      <EmptyState
                        title="Nothing urgent"
                        text="You are clear right now. Saved auctions ending soon will show below."
                      />
                    )}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel title="Watchlist Ending Soon">
                {watchlistLoading ? (
                  <Spinner />
                ) : watchlistEndingSoon.length > 0 ? (
                  <div className="grid gap-3">
                    {watchlistEndingSoon.map((auction) => (
                      <AuctionRow
                        key={auction._id}
                        image={auction.image?.url}
                        title={auction.title}
                        subtitle={`Ends ${formatDateTime(auction.endTime)}`}
                        value={formatCurrency(
                          auction.currentBid || auction.startingBid
                        )}
                        to={`/auction/item/${auction._id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No saved auctions"
                    text="Save auctions you care about to build a personal closing queue."
                    action={{ label: "Browse", to: "/auctions" }}
                  />
                )}
              </Panel>

              <Panel
                title="Won Auction Handoffs"
                action={{ label: "All Wins", to: "/won-auctions" }}
              >
                {wonAuctions.length > 0 ? (
                  <div className="grid gap-3">
                    {wonAuctions.slice(0, 4).map((auction) => (
                      <AuctionRow
                        key={auction._id}
                        image={auction.image?.url}
                        title={auction.title}
                        subtitle={getWinnerNextAction(auction).label}
                        value={formatCurrency(auction.currentBid)}
                        to={getWinnerNextAction(auction).to}
                        tone="emerald"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No wins yet"
                    text="Won auctions and seller handoff details will appear here."
                  />
                )}
              </Panel>

              <Panel
                title="Recommended"
                action={{ label: "All Auctions", to: "/auctions" }}
              >
                {recommendations.length > 0 ? (
                  <div className="grid gap-3">
                    {recommendations.map((auction) => (
                      <AuctionRow
                        key={auction._id}
                        image={auction.image?.url}
                        title={auction.title}
                        subtitle={auction.category || "Smart pick"}
                        value={formatCurrency(
                          auction.currentBid || auction.startingBid
                        )}
                        to={`/auction/item/${auction._id}`}
                        icon={Sparkles}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Recommendations need activity"
                    text="Watch or bid on a few auctions so PrimeBid can suggest better picks."
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

const Panel = ({ title, action, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {action && (
        <Link
          to={action.to}
          className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
        >
          {action.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

const AuctionRow = ({
  image,
  title,
  subtitle,
  value,
  to,
  tone = "indigo",
  icon: Icon,
}) => {
  const toneClass = {
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    indigo: "text-indigo-700 bg-indigo-50",
  }[tone];

  return (
    <Link
      to={to}
      className="grid gap-3 rounded-md border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40 sm:grid-cols-[64px_1fr_auto] sm:items-center"
    >
      <AuctionImage
        src={image}
        alt={title}
        aspect="square"
        fit="contain"
        className="h-16 w-16 p-1"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold ${toneClass}`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {value}
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

export default BidderDashboard;
