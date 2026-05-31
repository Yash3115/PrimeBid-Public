import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/* eslint-disable react/prop-types */

const actionTone = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-indigo-200 bg-indigo-50 text-indigo-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

const ActionCenter = ({
  actions,
  emptyText,
  emptyTitle,
  title,
  subtitle,
}) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <span className="w-fit rounded-md bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
        {actions.length} open
      </span>
    </div>
    {actions.length > 0 ? (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className={`rounded-md border p-4 transition hover:shadow-sm ${
              actionTone[action.priority] || actionTone.low
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{action.label}</p>
                <p className="mt-1 text-sm opacity-80">{action.detail}</p>
              </div>
              <span className="rounded-md bg-white/70 px-3 py-1 font-bold">
                {action.count}
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
              {action.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    ) : (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="font-semibold text-slate-950">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyText}</p>
      </div>
    )}
  </section>
);

export default ActionCenter;
