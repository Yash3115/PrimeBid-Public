import Spinner from "@/custom-components/Spinner";
import { formatCurrency, formatDateTime, getAuctionStatus } from "@/lib/format";
import {
  getAdminOverview,
  clearAllSuperAdminSliceErrors,
  getAllUsers,
  getKycSubmissions,
  getMonthlyRevenue,
  getWithdrawalRequests,
} from "@/store/slices/superAdminSlice";
import {
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gavel,
  IndianRupee,
  PackageCheck,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AuctionItemDelete from "./sub-components/AuctionItemDelete";
import AuditLogs from "./sub-components/AuditLogs";
import BiddersAuctioneersGraph from "./sub-components/BiddersAuctioneersGraph";
import PaymentGraph from "./sub-components/PaymentGraph";
import UserManagement from "./sub-components/UserManagement";
import KycManagement from "./sub-components/KycManagement";
import WithdrawalManagement from "./sub-components/WithdrawalManagement";
import DisputeManagement from "./sub-components/DisputeManagement";

/* eslint-disable react/prop-types */

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const { loading } = useSelector((state) => state.superAdmin);
  const { authChecked, user, isAuthenticated } = useSelector((state) => state.user);
  const { allAuctions, serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const {
    monthlyRevenue,
    overview,
    platformAccount,
    kycSubmissions,
    totalAuctioneers,
    totalBidders,
    withdrawalRequests,
  } = useSelector((state) => state.superAdmin);

  useEffect(() => {
    if (!authChecked) return;
    if (user.role !== "Super Admin" || !isAuthenticated) {
      navigateTo("/");
      return;
    }

    dispatch(getMonthlyRevenue());
    dispatch(getAdminOverview());
    dispatch(getAllUsers());
    dispatch(getKycSubmissions("Pending"));
    dispatch(getWithdrawalRequests("Pending"));
    dispatch(clearAllSuperAdminSliceErrors());
  }, [authChecked, dispatch, isAuthenticated, navigateTo, user.role]);

  const sections = [
    {
      icon: BarChart3,
      title: "Monthly Total Payments Received",
      id: "revenue",
      content: <PaymentGraph />,
    },
    { icon: Users, title: "Users", id: "users", content: <BiddersAuctioneersGraph /> },
    { icon: Users, title: "User Management", id: "user-management", content: <UserManagement /> },
    { icon: BadgeIndianRupee, title: "Auctioneer KYC", id: "kyc", content: <KycManagement /> },
    { icon: BadgeIndianRupee, title: "Wallet Withdrawals", id: "withdrawals", content: <WithdrawalManagement /> },
    { icon: AlertTriangle, title: "Delivery Disputes", id: "disputes", content: <DisputeManagement /> },
    { icon: BarChart3, title: "Audit Log", id: "audit-log", content: <AuditLogs /> },
    {
      icon: Trash2,
      title: "Delete Items From Auction",
      id: "auction-moderation",
      content: <AuctionItemDelete />,
    },
  ];

  const totalRevenue = monthlyRevenue.reduce(
    (total, amount) => total + Number(amount || 0),
    0
  );
  const localPendingWithdrawals = withdrawalRequests.filter(
    (withdrawal) => withdrawal.status === "Pending"
  ).length;
  const overviewPendingWithdrawals =
    overview?.withdrawals?.byStatus?.Pending?.count;
  const pendingWithdrawals =
    Number.isFinite(Number(overviewPendingWithdrawals))
      ? Number(overviewPendingWithdrawals)
      : localPendingWithdrawals;
  const pendingWithdrawalAmount =
    overview?.withdrawals?.byStatus?.Pending?.amount || 0;
  const pendingKyc = overview?.kyc?.Pending ?? kycSubmissions.length;
  const activeAuctionsFromOverview = overview?.auctions?.live;
  const activeAuctionsFallback = allAuctions.filter(
    (auction) =>
      getAuctionStatus(auction, undefined, serverTime, serverTimeReceivedAt) ===
      "Live"
  ).length;
  const activeAuctions =
    activeAuctionsFromOverview ?? activeAuctionsFallback;
  const registeredUsersFallback =
    totalAuctioneers.reduce((total, count) => total + Number(count || 0), 0) +
    totalBidders.reduce((total, count) => total + Number(count || 0), 0);
  const registeredUsers = overview?.users?.total ?? registeredUsersFallback;
  const totalAuctions = overview?.auctions?.total ?? allAuctions.length;
  const platformBalance =
    overview?.platform?.availableBalance ?? platformAccount?.availableBalance ?? totalRevenue;
  const summaryCards = [
    {
      icon: Wallet,
      label: "Platform Balance",
      value: formatCurrency(platformBalance),
      detail: "Auto-deducted wallet commission",
    },
    {
      icon: IndianRupee,
      label: "Pending Withdrawals",
      value: pendingWithdrawals,
      detail: `${formatCurrency(pendingWithdrawalAmount)} waiting for review`,
    },
    {
      icon: Gavel,
      label: "Live Auctions",
      value: activeAuctions,
      detail: `${totalAuctions} total auctions`,
    },
    {
      icon: Users,
      label: "Registered Users",
      value: registeredUsers,
      detail: "Bidders and auctioneers",
    },
    {
      icon: Clock3,
      label: "Locked Wallet Funds",
      value: formatCurrency(overview?.wallet?.lockedBalance || 0),
      detail: "Reserved for bids and payouts",
    },
    {
      icon: PackageCheck,
      label: "Fulfillment Queue",
      value: overview?.fulfillment?.ReadyToShip || 0,
      detail: `${overview?.disputes?.open || overview?.fulfillment?.IssueReported || 0} open disputes`,
    },
  ];
  const opsQueue =
    overview?.actionQueue?.length > 0
      ? overview.actionQueue
      : [
          {
            label: "KYC approvals",
            count: pendingKyc,
            href: "#kyc",
            detail: "Auctioneers waiting to list",
            priority: "high",
          },
          {
            label: "Withdrawals",
            count: pendingWithdrawals,
            href: "#withdrawals",
            detail: "Manual payout queue",
            priority: "critical",
          },
        ].filter((item) => item.count > 0);

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="mb-8 rounded-lg border border-indigo-100 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="app-kicker">
                Admin Command Center
              </p>
              <h1 className="mt-2 text-4xl font-bold text-slate-950 md:text-5xl">
                Platform Operations
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Review trust queues, monitor wallet movement, and keep auction
                activity healthy from one place.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:min-w-[420px]">
              {opsQueue.length > 0 ? opsQueue.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {item.count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </a>
              )) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    No urgent admin queue
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    KYC, payout, and fulfillment queues are currently clear.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav
          className="sticky top-3 z-20 mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur xl:top-4"
          aria-label="Admin dashboard sections"
        >
          <div className="flex min-w-max gap-2">
            {sections.map(({ id, title }) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                {title}
              </a>
            ))}
          </div>
        </nav>

        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map(({ icon: Icon, label, value, detail }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {value}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>

            <OperationsPulse overview={overview} opsQueue={opsQueue} />

            {sections.map(({ icon: Icon, title, content, id }) => (
              <div
                key={title}
                id={id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
              >
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-950">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  {title}
                </h2>
                {content}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const priorityTone = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-indigo-200 bg-indigo-50 text-indigo-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

const OperationsPulse = ({ overview, opsQueue }) => {
  const auctionRows = [
    ["Live", overview?.auctions?.live || 0],
    ["Upcoming", overview?.auctions?.upcoming || 0],
    ["Ended", overview?.auctions?.ended || 0],
    ["Draft", overview?.auctions?.draft || 0],
    ["Invalid dates", overview?.auctions?.invalid || 0],
  ];
  const financeRows = [
    ["User available", formatCurrency(overview?.wallet?.availableBalance || 0)],
    ["User locked", formatCurrency(overview?.wallet?.lockedBalance || 0)],
    ["Deposited", formatCurrency(overview?.wallet?.lifetimeDeposited || 0)],
    ["Withdrawn", formatCurrency(overview?.wallet?.lifetimeWithdrawn || 0)],
    [
      "Platform earned",
      formatCurrency(overview?.platform?.lifetimeCommission || 0),
    ],
  ];
  const fulfillmentRows = [
    ["Awaiting address", overview?.fulfillment?.AwaitingAddress || 0],
    ["Ready to ship", overview?.fulfillment?.ReadyToShip || 0],
    ["Shipped", overview?.fulfillment?.Shipped || 0],
    ["Out for delivery", overview?.fulfillment?.OutForDelivery || 0],
    ["Open disputes", overview?.disputes?.open || overview?.fulfillment?.IssueReported || 0],
  ];

  return (
    <section
      id="operations"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6 xl:grid-cols-[1.2fr_0.8fr]"
    >
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-kicker">Operations Pulse</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              What needs attention now
            </h2>
          </div>
          {overview?.generatedAt && (
            <span className="w-fit rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              Updated {formatDateTime(overview.generatedAt)}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {opsQueue.length > 0 ? (
            opsQueue.map((item) => (
              <a
                key={item.id || item.label}
                href={item.href}
                className={`rounded-md border p-4 transition hover:shadow-sm ${
                  priorityTone[item.priority] || priorityTone.low
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.label}</p>
                    <p className="mt-1 text-sm opacity-80">{item.detail}</p>
                  </div>
                  <span className="rounded-md bg-white/70 px-3 py-1 text-lg font-bold">
                    {item.count}
                  </span>
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 md:col-span-2">
              <p className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                No urgent operations waiting.
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                The trust, payout, and fulfillment queues are clear.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MiniOpsList title="Auction lifecycle" icon={Gavel} rows={auctionRows} />
          <MiniOpsList title="Wallet movement" icon={ShieldCheck} rows={financeRows} />
          <MiniOpsList title="Fulfillment" icon={PackageCheck} rows={fulfillmentRows} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Recent platform credits
        </h3>
        <div className="mt-4 grid gap-3">
          {(overview?.recentPlatformTransactions || []).length > 0 ? (
            overview.recentPlatformTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {transaction.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(transaction.createdAt)}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-700">
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
              Commission credits will appear here after auctions settle.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const MiniOpsList = ({ title, icon: Icon, rows }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <h3 className="flex items-center gap-2 font-bold text-slate-950">
      <Icon className="h-4 w-4 text-indigo-600" />
      {title}
    </h3>
    <div className="mt-3 grid gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="text-slate-500">{label}</span>
          <span className="font-bold text-slate-950">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

export default Dashboard;
