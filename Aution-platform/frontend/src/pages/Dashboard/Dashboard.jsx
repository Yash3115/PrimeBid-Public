import Spinner from "@/custom-components/Spinner";
import { formatCurrency, getAuctionStatus } from "@/lib/format";
import {
  clearAllSuperAdminSliceErrors,
  getAllUsers,
  getKycSubmissions,
  getMonthlyRevenue,
  getWithdrawalRequests,
} from "@/store/slices/superAdminSlice";
import {
  BadgeIndianRupee,
  BarChart3,
  Gavel,
  Trash2,
  Users,
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
  const pendingWithdrawals = withdrawalRequests.filter(
    (withdrawal) => withdrawal.status === "Pending"
  ).length;
  const pendingKyc = kycSubmissions.length;
  const activeAuctions = allAuctions.filter(
    (auction) =>
      getAuctionStatus(auction, undefined, serverTime, serverTimeReceivedAt) ===
      "Live"
  ).length;
  const registeredUsers =
    totalAuctioneers.reduce((total, count) => total + Number(count || 0), 0) +
    totalBidders.reduce((total, count) => total + Number(count || 0), 0);
  const summaryCards = [
    {
      icon: BadgeIndianRupee,
      label: "Platform Balance",
      value: formatCurrency(platformAccount?.availableBalance ?? totalRevenue),
      detail: "Auto-deducted wallet commission",
    },
    {
      icon: BadgeIndianRupee,
      label: "Pending Withdrawals",
      value: pendingWithdrawals,
      detail: "Wallet payout reviews",
    },
    {
      icon: Gavel,
      label: "Live Auctions",
      value: activeAuctions,
      detail: `${allAuctions.length} total auctions`,
    },
    {
      icon: Users,
      label: "Registered Users",
      value: registeredUsers,
      detail: "Bidders and auctioneers",
    },
  ];
  const opsQueue = [
    {
      label: "KYC approvals",
      value: pendingKyc,
      to: "#kyc",
      detail: "Auctioneers waiting to list",
    },
    {
      label: "Withdrawals",
      value: pendingWithdrawals,
      to: "#withdrawals",
      detail: "Manual payout queue",
    },
  ];

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
              {opsQueue.map((item) => (
                <a
                  key={item.label}
                  href={item.to}
                  className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

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

export default Dashboard;
