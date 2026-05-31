/* eslint-disable react/prop-types */
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Gavel,
  ShieldAlert,
  Truck,
  WalletCards,
} from "lucide-react";
import { useSelector } from "react-redux";

const groupIcons = {
  kyc: BadgeCheck,
  withdrawals: WalletCards,
  disputes: AlertTriangle,
  settlement: ShieldAlert,
  fulfillment: Truck,
  "seller-risk": ShieldAlert,
  "auction-risk": Gavel,
};

const priorityTone = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-indigo-200 bg-indigo-50 text-indigo-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

const slaTone = {
  Critical: "bg-red-100 text-red-800",
  Warning: "bg-amber-100 text-amber-800",
  Fresh: "bg-emerald-100 text-emerald-800",
};

const OperationsCenter = () => {
  const operations = useSelector((state) => state.superAdmin.operations);
  const groups = operations?.groups || [];
  const summary = operations?.summary || {};

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <OpsSummaryCard
          label="Open operations"
          value={summary.totalOpen || 0}
          detail="Across trust, payout, delivery, and auction health"
        />
        <OpsSummaryCard
          label="Critical"
          value={summary.criticalOpen || 0}
          detail="Handle before normal review work"
          tone="critical"
        />
        <OpsSummaryCard
          label="SLA warnings"
          value={summary.warningOpen || 0}
          detail={
            operations?.generatedAt
              ? `Updated ${formatDateTime(operations.generatedAt)}`
              : "Waiting for refresh"
          }
        />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          Operations queue is empty.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <OperationGroup key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
};

const OperationGroup = ({ group }) => {
  const Icon = groupIcons[group.id] || AlertTriangle;
  const tone = priorityTone[group.priority] || priorityTone.medium;

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-indigo-700 shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-950">{group.label}</h3>
            <p className="mt-1 text-sm text-slate-500">{group.detail}</p>
          </div>
        </div>
        <span className={`w-fit rounded-md border px-3 py-1 text-sm font-bold ${tone}`}>
          {group.count} open
        </span>
      </div>

      <div className="grid gap-3 p-4">
        {group.items?.length > 0 ? (
          group.items.map((item) => <OperationItem key={item.id} item={item} />)
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            {group.emptyLabel}
          </div>
        )}
      </div>
    </article>
  );
};

const OperationItem = ({ item }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-bold text-slate-950">{item.title}</p>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
            {item.status || "Review"}
          </span>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold ${
              slaTone[item.slaStatus] || slaTone.Fresh
            }`}
          >
            {item.slaStatus}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {item.ageHours || 0}h open
          </span>
          {item.createdAt && <span>{formatDateTime(item.createdAt)}</span>}
          {item.amount !== null && item.amount !== undefined && (
            <span className="text-slate-700">{formatCurrency(item.amount)}</span>
          )}
        </div>
        <OperationMeta meta={item.meta} />
      </div>
      <a
        href={item.href || "#"}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
      >
        {item.actionLabel || "Review"}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  </div>
);

const OperationMeta = ({ meta = {} }) => {
  const rows = Object.entries(meta).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });
  if (!rows.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {rows.slice(0, 4).map(([key, value]) => (
        <span
          key={key}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
        >
          {formatMetaLabel(key)}: {formatMetaValue(value)}
        </span>
      ))}
    </div>
  );
};

const formatMetaValue = (value) => {
  const nextValue = Array.isArray(value) ? value[0] : value;
  if (nextValue === undefined || nextValue === null) return "";
  if (typeof nextValue === "object") return JSON.stringify(nextValue);
  return String(nextValue);
};

const formatMetaLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());

const OpsSummaryCard = ({ label, value, detail, tone = "normal" }) => (
  <div
    className={`rounded-md border p-4 ${
      tone === "critical"
        ? "border-red-200 bg-red-50"
        : "border-slate-200 bg-slate-50"
    }`}
  >
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-950">
      {tone === "critical" && <AlertTriangle className="h-5 w-5 text-red-600" />}
      {value}
      {tone !== "critical" && Number(value || 0) === 0 && (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      )}
    </p>
    <p className="mt-1 text-sm text-slate-500">{detail}</p>
  </div>
);

export default OperationsCenter;
