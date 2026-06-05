import {
  DEMO_PERSONAS,
  getDemoDashboardPath,
  getDemoExpiryLabel,
} from "@/lib/demoMode";
import { exitDemo, switchDemoPersona } from "@/store/slices/userSlice";
import { LogOut, RefreshCw, Users } from "lucide-react";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const DemoModeBanner = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.user);
  const persona = user?.demoPersona || user?.role || "Bidder";
  const expiresAt = user?.demoExpiresAt;
  const expiryLabel = useMemo(() => getDemoExpiryLabel(expiresAt), [expiresAt]);

  if (!user?.isDemo) return null;

  const handleSwitch = async (nextPersona) => {
    if (nextPersona === persona || loading) return;
    const result = await dispatch(switchDemoPersona(nextPersona));
    if (result?.success) {
      navigate(result.demo?.dashboardPath || getDemoDashboardPath(nextPersona));
    }
  };

  const handleExit = async () => {
    await dispatch(exitDemo());
    navigate("/", { replace: true });
  };

  return (
    <section className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 px-4 py-3 shadow-sm backdrop-blur xl:ml-[280px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold uppercase text-white">
              Demo Mode
            </span>
            <span className="text-sm font-semibold text-amber-950">
              {persona} sandbox
            </span>
            <span className="text-sm text-amber-800">{expiryLabel}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Demo money, bids, auctions, shipments, and admin actions are isolated
            and reset after 24 hours.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex gap-1 overflow-x-auto rounded-md border border-amber-200 bg-white p-1">
            {DEMO_PERSONAS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSwitch(item)}
                disabled={loading}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  item === persona
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-amber-100"
                }`}
              >
                <Users className="h-4 w-4" />
                {item === "Super Admin" ? "Admin" : item}
              </button>
            ))}
          </div>
          <Link
            to="/sign-up?fromDemo=1"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Create real account
          </Link>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Exit demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default DemoModeBanner;
