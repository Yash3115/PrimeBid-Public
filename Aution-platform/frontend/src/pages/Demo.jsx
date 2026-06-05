import { api, getErrorMessage } from "@/lib/api";
import { DEMO_PERSONAS, getDemoDashboardPath } from "@/lib/demoMode";
import { startDemo, switchDemoPersona } from "@/store/slices/userSlice";
import { BadgeCheck, Gavel, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const personaDetails = {
  Bidder: {
    icon: WalletCards,
    title: "Bidder Demo",
    description:
      "Browse live auctions, top up a sandbox wallet, place bids, win items, and complete delivery handoff.",
    features: ["Wallet-backed bids", "Won auction flow", "Notifications"],
  },
  Auctioneer: {
    icon: Gavel,
    title: "Auctioneer Demo",
    description:
      "Create demo listings, manage concurrent auctions, process fulfillment, and review seller payouts.",
    features: ["Create listings", "Fulfillment queue", "Withdrawals"],
  },
  "Super Admin": {
    icon: ShieldCheck,
    title: "Admin Demo",
    description:
      "Review sandbox KYC, withdrawals, disputes, risk queues, users, reports, and platform operations.",
    features: ["Operations console", "KYC/payments", "Risk review"],
  },
};

const Demo = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, user } = useSelector((state) => state.user);
  const [status, setStatus] = useState({
    available: true,
    loading: true,
    message: "",
    ttlHours: 24,
  });

  useEffect(() => {
    let active = true;
    api
      .get("/demo/status")
      .then((response) => {
        if (!active) return;
        setStatus({
          available: Boolean(response.data.available),
          loading: false,
          message: response.data.message || "",
          ttlHours: response.data.ttlHours || 24,
        });
      })
      .catch((error) => {
        if (!active) return;
        setStatus({
          available: false,
          loading: false,
          message: getErrorMessage(error, "Demo Mode is unavailable right now"),
          ttlHours: 24,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const currentPersona = user?.isDemo ? user.demoPersona || user.role : "";
  const statusText = useMemo(() => {
    if (status.loading) return "Checking demo availability...";
    if (!status.available) return status.message || "Demo Mode is unavailable right now";
    return `Each sandbox lasts ${status.ttlHours} hours and stays separate from real users, bids, wallets, and admin data.`;
  }, [status]);

  const handleStart = async (persona) => {
    if (loading || !status.available) return;
    const action = user?.isDemo ? switchDemoPersona(persona) : startDemo(persona);
    const result = await dispatch(action);
    if (result?.success) {
      navigate(result.demo?.dashboardPath || getDemoDashboardPath(persona), {
        replace: true,
      });
    }
  };

  return (
    <section className="app-page">
      <div className="app-container grid gap-6">
        <div className="page-header grid gap-4 bg-slate-950 text-white">
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-950">
            <Sparkles className="h-4 w-4" />
            Parallel sandbox
          </span>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Try PrimeBid without touching live data.
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                Demo Mode runs on a separate sandbox database. You can bid,
                create auctions, and review admin queues with sample data that
                resets automatically.
              </p>
            </div>
            <Link
              to="/sign-up?fromDemo=1"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/10"
            >
              Create real account
            </Link>
          </div>
        </div>

        <div
          className={`rounded-lg border p-4 ${
            status.available
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold leading-6">{statusText}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {DEMO_PERSONAS.map((persona) => {
            const detail = personaDetails[persona];
            const Icon = detail.icon;
            const isCurrentPersona = currentPersona === persona;
            return (
              <article
                key={persona}
                className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  {isCurrentPersona && (
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                      Active
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {detail.title}
                  </h2>
                  <p className="mt-2 leading-6 text-slate-600">
                    {detail.description}
                  </p>
                </div>
                <ul className="grid gap-2 text-sm font-semibold text-slate-600">
                  {detail.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleStart(persona)}
                  disabled={loading || status.loading || !status.available}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading
                    ? "Starting..."
                    : isCurrentPersona
                      ? "Open this sandbox"
                      : `Start ${persona === "Super Admin" ? "Admin" : persona} Demo`}
                </button>
              </article>
            );
          })}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">
            What stays sandbox-only
          </h2>
          <p className="mt-2 leading-7 text-slate-600">
            Demo money, bids, auction listings, admin actions, fulfillment,
            withdrawals, and fake history never affect real PrimeBid users or
            production records. When you create a real account, only safe
            interests such as bidder watchlist categories can carry over.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Demo;
