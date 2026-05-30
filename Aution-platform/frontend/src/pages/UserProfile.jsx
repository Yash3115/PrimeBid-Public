import Spinner from "@/custom-components/Spinner";
import { formatCurrency } from "@/lib/format";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const { authChecked, user, isAuthenticated, loading } = useSelector(
    (state) => state.user
  );
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      navigateTo("/");
    }
  }, [authChecked, isAuthenticated, navigateTo]);

  const personalDetails = [
    [UserRound, "Username", user.userName],
    [Mail, "Email", user.email],
    [Phone, "Phone", user.phone || "Not provided"],
    [MapPin, "Address", user.address || "Not provided"],
    [BadgeCheck, "Role", user.role],
    ...(user.role === "Auctioneer"
      ? [[BadgeCheck, "KYC Status", user.kycStatus || "Not Submitted"]]
      : []),
    [CalendarDays, "Joined On", user.createdAt?.substring(0, 10) || "Not set"],
  ];

  const stats =
    user.role === "Auctioneer"
      ? [["Wallet Balance", formatCurrency(user.wallet?.availableBalance || 0)]]
      : [
          ["Auctions Won", user.auctionsWon || 0],
          ["Money Spent", formatCurrency(user.moneySpent || user.moneyspend)],
        ];

  const bankTransfer = user.paymentMethods?.bankTransfer;
  const bankDetails = [
    [Landmark, "Bank", bankTransfer?.bankName],
    [UserRound, "Account Name", bankTransfer?.bankAccountName],
    [CreditCard, "Account Number", bankTransfer?.bankAccountNumber],
    [Building2, "IFSC Code", bankTransfer?.bankIFSCCode],
  ];

  return (
    <section className="app-page">
      <div className="app-container">
        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
              <img
                src={user.profileImage?.url || "/imageHolder.jpg"}
                alt={user.userName}
                className="mx-auto h-32 w-32 rounded-full object-cover"
              />
              <h1 className="mt-5 text-2xl font-bold text-slate-950">
                {user.userName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-indigo-700">
                {user.role}
              </p>
              <div className="mt-6 grid gap-3">
                {stats.map(([label, value]) => (
                  <div key={label} className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6">
                <p className="app-kicker">
                  Account
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  Personal Details
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {personalDetails.map(([Icon, label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Icon className="h-4 w-4 text-indigo-600" />
                      {label}
                    </div>
                    <p className="mt-2 break-words font-semibold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {user.role === "Auctioneer" && (
                <div className="mt-8">
                  <h3 className="mb-4 text-xl font-semibold text-slate-950">
                    Payment Method
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {bankDetails.map(([Icon, label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                          <Icon className="h-4 w-4 text-indigo-600" />
                          {label}
                        </div>
                        <p className="mt-2 break-words font-semibold text-slate-950">
                          {value || "Not provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default UserProfile;
