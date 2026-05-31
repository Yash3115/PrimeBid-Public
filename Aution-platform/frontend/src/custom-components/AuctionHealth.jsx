import { Activity, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";

/* eslint-disable react/prop-types */
const toneClasses = {
  emerald: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  amber: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    icon: AlertTriangle,
  },
  rose: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    icon: AlertTriangle,
  },
  indigo: {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
    icon: Activity,
  },
  slate: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
    icon: Activity,
  },
};

const getTone = (tone) => toneClasses[tone] || toneClasses.slate;

export const AuctionHealthBadge = ({ health, compact = false }) => {
  if (!health) return null;
  const tone = getTone(health.tone);
  const Icon = tone.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${tone.badge}`}
      title={health.summary}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? health.label : `${health.label} · ${Math.round(health.score || 0)}/100`}
    </span>
  );
};

export const AuctionHealthPanel = ({ health }) => {
  if (!health) return null;
  const tone = getTone(health.tone);
  const score = Math.round(health.score || 0);
  const signals = health.signals || {};

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Auction Health
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AuctionHealthBadge health={health} />
          </div>
        </div>
        <span className="text-2xl font-bold text-slate-950">{score}</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full ${tone.bar}`}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{health.summary}</p>

      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 min-[420px]:grid-cols-2">
        <span className="rounded-md bg-white px-3 py-2">Bids: {signals.bidCount || 0}</span>
        <span className="rounded-md bg-white px-3 py-2">Watchers: {signals.watcherCount || 0}</span>
        <span className="rounded-md bg-white px-3 py-2">Quality: {signals.qualityScore || 0}/100</span>
        <span className="rounded-md bg-white px-3 py-2">
          {signals.hoursRemaining === null || signals.hoursRemaining === undefined
            ? signals.runtimeStatus || "Draft"
            : `${signals.hoursRemaining}h left`}
        </span>
      </div>

      {health.recommendations?.length > 0 && (
        <div className="mt-3 grid gap-2">
          {health.recommendations.map((item) => (
            <p key={item} className="flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-slate-700">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {item}
            </p>
          ))}
        </div>
      )}
    </section>
  );
};
