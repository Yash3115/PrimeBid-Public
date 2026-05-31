import { Loader2 } from "lucide-react";

const Spinner = () => {
  return (
    <div
      className="flex min-h-[320px] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        Loading
      </div>
    </div>
  );
};

export default Spinner;
