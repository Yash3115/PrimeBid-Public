import Spinner from "@/custom-components/Spinner";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  clearAllSuperAdminSliceErrors,
  getAdminOperations,
  getAdminOverview,
  getAllUsers,
  getFulfillmentSettlements,
  getKycSubmissions,
  getMonthlyRevenue,
  getWithdrawalRequests,
} from "@/store/slices/superAdminSlice";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AuctionItemDelete from "./sub-components/AuctionItemDelete";
import AuditLogs from "./sub-components/AuditLogs";
import BiddersAuctioneersGraph from "./sub-components/BiddersAuctioneersGraph";
import DisputeManagement from "./sub-components/DisputeManagement";
import EscrowSettlementManagement from "./sub-components/EscrowSettlementManagement";
import KycManagement from "./sub-components/KycManagement";
import OperationsCenter from "./sub-components/OperationsCenter";
import PaymentGraph from "./sub-components/PaymentGraph";
import SellerRiskManagement from "./sub-components/SellerRiskManagement";
import UserManagement from "./sub-components/UserManagement";
import WithdrawalManagement from "./sub-components/WithdrawalManagement";

/* eslint-disable react/prop-types */

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const [activeTab, setActiveTab] = useState("queue");
  const { authChecked, isAuthenticated, user } = useSelector(
    (state) => state.user
  );
  const {
    kycSubmissions,
    loading,
    monthlyRevenue,
    operations,
    overview,
    platformAccount,
    withdrawalRequests,
  } = useSelector((state) => state.superAdmin);

  const refreshAdminData = useCallback(() => {
    dispatch(getMonthlyRevenue());
    dispatch(getAdminOverview());
    dispatch(getAdminOperations());
    dispatch(getAllUsers());
    dispatch(getKycSubmissions("Pending"));
    dispatch(getWithdrawalRequests("Pending"));
    dispatch(getFulfillmentSettlements("Review"));
    dispatch(clearAllSuperAdminSliceErrors());
  }, [dispatch]);

  useEffect(() => {
    if (!authChecked) return;
    if (user?.role !== "Super Admin" || !isAuthenticated) {
      navigateTo("/");
      return;
    }

    refreshAdminData();
  }, [authChecked, isAuthenticated, navigateTo, refreshAdminData, user?.role]);

  const localPendingWithdrawals = withdrawalRequests.filter(
    (withdrawal) => withdrawal.status === "Pending"
  ).length;
  const pendingWithdrawals = Number(
    overview?.withdrawals?.byStatus?.Pending?.count ?? localPendingWithdrawals
  );
  const pendingWithdrawalAmount =
    overview?.withdrawals?.byStatus?.Pending?.amount || 0;
  const pendingKyc = overview?.kyc?.Pending ?? kycSubmissions.length;
  const openDisputes =
    overview?.disputes?.open || overview?.fulfillment?.IssueReported || 0;
  const platformBalance =
    overview?.platform?.availableBalance ??
    platformAccount?.availableBalance ??
    monthlyRevenue.reduce((total, amount) => total + Number(amount || 0), 0);
  const escrowHeld =
    Number(overview?.fulfillmentSettlement?.HeldInEscrow?.amount || 0) +
    Number(overview?.fulfillmentSettlement?.ReadyToRelease?.amount || 0) +
    Number(overview?.fulfillmentSettlement?.UnderDispute?.amount || 0);
  const lastUpdated = overview?.generatedAt || operations?.generatedAt;
  const hasAdminData = Boolean(overview || operations);

  const queueCounters = [
    {
      label: "Open operations",
      value: operations?.summary?.totalOpen || overview?.actionQueue?.length || 0,
      detail: "Trust, payout, delivery, and risk work",
      tone: "slate",
    },
    {
      label: "Critical",
      value: operations?.summary?.criticalOpen || 0,
      detail: "Handle before normal review",
      tone: "critical",
    },
    {
      label: "SLA warnings",
      value: operations?.summary?.warningOpen || 0,
      detail: "Aging queues",
      tone: "warning",
    },
    {
      label: "Pending KYC",
      value: pendingKyc,
      detail: "Auctioneers waiting",
      tone: "slate",
    },
    {
      label: "Withdrawals",
      value: pendingWithdrawals,
      detail: formatCurrency(pendingWithdrawalAmount),
      tone: pendingWithdrawals ? "warning" : "success",
    },
    {
      label: "Open disputes",
      value: openDisputes,
      detail: "Delivery issues",
      tone: openDisputes ? "critical" : "success",
    },
  ];

  const tabs = [
    {
      id: "queue",
      label: "Queue",
      icon: AlertTriangle,
      badge: queueCounters[0].value,
    },
    {
      id: "users",
      label: "Users & KYC",
      icon: Users,
      badge: pendingKyc,
    },
    {
      id: "payments",
      label: "Payments",
      icon: Wallet,
      badge: pendingWithdrawals,
    },
    {
      id: "fulfillment",
      label: "Fulfillment",
      icon: PackageCheck,
      badge: openDisputes,
    },
    {
      id: "risk",
      label: "Risk",
      icon: ShieldCheck,
      badge: overview?.sellerRisk?.highRiskCount || 0,
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
  ];

  return (
    <section className="app-page">
      <div className="app-container grid gap-5">
        <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="app-kicker">Super Admin</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">
                Operations Console
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <StatusDot tone={hasAdminData ? "success" : "warning"} />
                <span>
                  {hasAdminData
                    ? "Live admin data loaded"
                    : "Waiting for admin data"}
                </span>
                {lastUpdated && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    Updated {formatDateTime(lastUpdated)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={refreshAdminData}
              disabled={loading}
              className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <nav
          className="sticky top-3 z-20 overflow-x-auto rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur xl:top-4"
          aria-label="Admin workspaces"
        >
          <div className="flex min-w-max gap-2">
            {tabs.map(({ badge, icon: Icon, id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {Number(badge || 0) > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {!authChecked || (loading && !hasAdminData) ? (
          <Spinner />
        ) : (
          <div className="grid gap-5">
            {activeTab === "queue" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {queueCounters.map((counter) => (
                    <ConsoleMetric key={counter.label} {...counter} />
                  ))}
                </div>
                <AdminPanel
                  title="Operations Queue"
                  icon={AlertTriangle}
                  count={queueCounters[0].value}
                >
                  <OperationsCenter />
                </AdminPanel>
              </>
            )}

            {activeTab === "users" && (
              <div className="grid gap-5">
                <AdminPanel title="User Management" icon={Users}>
                  <UserManagement />
                </AdminPanel>
                <AdminPanel title="Auctioneer KYC" icon={ShieldCheck} count={pendingKyc}>
                  <KycManagement />
                </AdminPanel>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="grid gap-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <ConsoleMetric
                    label="Platform balance"
                    value={formatCurrency(platformBalance)}
                    detail="Available commission"
                    tone="success"
                  />
                  <ConsoleMetric
                    label="Pending withdrawals"
                    value={pendingWithdrawals}
                    detail={formatCurrency(pendingWithdrawalAmount)}
                    tone={pendingWithdrawals ? "warning" : "success"}
                  />
                  <ConsoleMetric
                    label="Escrow held"
                    value={formatCurrency(escrowHeld)}
                    detail="Awaiting release or refund"
                    tone="slate"
                  />
                </div>
                <AdminPanel title="Wallet Withdrawals" icon={Wallet} count={pendingWithdrawals}>
                  <WithdrawalManagement />
                </AdminPanel>
                <AdminPanel title="Escrow Settlements" icon={PackageCheck}>
                  <EscrowSettlementManagement />
                </AdminPanel>
              </div>
            )}

            {activeTab === "fulfillment" && (
              <div className="grid gap-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <ConsoleMetric
                    label="Awaiting address"
                    value={overview?.fulfillment?.AwaitingAddress || 0}
                    detail="Buyer handoff"
                  />
                  <ConsoleMetric
                    label="Ready to ship"
                    value={overview?.fulfillment?.ReadyToShip || 0}
                    detail="Seller action"
                  />
                  <ConsoleMetric
                    label="In transit"
                    value={
                      Number(overview?.fulfillment?.Shipped || 0) +
                      Number(overview?.fulfillment?.OutForDelivery || 0)
                    }
                    detail="Shipment movement"
                  />
                  <ConsoleMetric
                    label="Open disputes"
                    value={openDisputes}
                    detail="Needs admin review"
                    tone={openDisputes ? "critical" : "success"}
                  />
                </div>
                <AdminPanel title="Delivery Disputes" icon={AlertTriangle} count={openDisputes}>
                  <DisputeManagement />
                </AdminPanel>
              </div>
            )}

            {activeTab === "risk" && (
              <div className="grid gap-5">
                <AdminPanel
                  title="Seller Risk"
                  icon={ShieldCheck}
                  count={overview?.sellerRisk?.highRiskCount || 0}
                >
                  <SellerRiskManagement />
                </AdminPanel>
                <AdminPanel title="Auction Moderation" icon={Trash2}>
                  <AuctionItemDelete />
                </AdminPanel>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="grid gap-5">
                <AdminPanel title="Monthly Payments" icon={BarChart3}>
                  <PaymentGraph />
                </AdminPanel>
                <AdminPanel title="Users" icon={Users}>
                  <BiddersAuctioneersGraph />
                </AdminPanel>
                <AdminPanel title="Audit Log" icon={FileText}>
                  <AuditLogs />
                </AdminPanel>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const metricTone = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  slate: "border-slate-200 bg-white text-slate-800",
};

const ConsoleMetric = ({ detail, label, tone = "slate", value }) => (
  <div className={`rounded-lg border p-4 shadow-sm ${metricTone[tone]}`}>
    <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
      {label}
    </p>
    <p className="mt-2 break-words text-2xl font-bold leading-tight tabular-nums">
      {value}
    </p>
    <p className="mt-1 text-xs font-semibold opacity-75">{detail}</p>
  </div>
);

const AdminPanel = ({ children, count, icon: Icon, title }) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
        <Icon className="h-4 w-4 text-indigo-600" />
        {title}
      </h2>
      {Number(count || 0) > 0 && (
        <span className="w-fit rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
          {count} open
        </span>
      )}
    </div>
    <div className="p-4 md:p-5">{children}</div>
  </section>
);

const StatusDot = ({ tone }) => (
  <span
    className={`h-2.5 w-2.5 rounded-full ${
      tone === "success" ? "bg-emerald-500" : "bg-amber-500"
    }`}
  />
);

export default Dashboard;
