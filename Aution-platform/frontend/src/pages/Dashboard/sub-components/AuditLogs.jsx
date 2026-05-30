import { formatDateTime } from "@/lib/format";
import { getAuditLogs } from "@/store/slices/superAdminSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const AuditLogs = () => {
  const dispatch = useDispatch();
  const { auditLogs } = useSelector((state) => state.superAdmin);

  useEffect(() => {
    dispatch(getAuditLogs());
  }, [dispatch]);

  return (
    <div className="grid gap-3">
      {auditLogs.length > 0 ? (
        auditLogs.map((log) => (
          <div
            key={log._id}
            className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[180px_1fr_auto] md:items-center"
          >
            <p className="font-semibold text-slate-950">{log.action}</p>
            <p className="text-sm text-slate-600">
              {log.summary || "No summary"} by{" "}
              {log.actor?.userName || log.actor?.email || "System"}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {formatDateTime(log.createdAt)}
            </p>
          </div>
        ))
      ) : (
        <p className="rounded-md bg-slate-50 p-4 text-slate-500">
          No admin activity recorded yet.
        </p>
      )}
    </div>
  );
};

export default AuditLogs;
