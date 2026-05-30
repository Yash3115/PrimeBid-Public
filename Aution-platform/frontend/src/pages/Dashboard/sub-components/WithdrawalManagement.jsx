import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getWithdrawalRequests,
  reviewWithdrawalRequest,
} from "@/store/slices/superAdminSlice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const WithdrawalManagement = () => {
  const dispatch = useDispatch();
  const { withdrawalRequests } = useSelector((state) => state.superAdmin);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [comments, setComments] = useState({});

  useEffect(() => {
    dispatch(getWithdrawalRequests(statusFilter));
  }, [dispatch, statusFilter]);

  const handleReview = async (id, status) => {
    await dispatch(reviewWithdrawalRequest(id, status, comments[id] || ""));
    setComments((current) => ({ ...current, [id]: "" }));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Review user wallet withdrawals before manual bank payout.
        </p>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-48"
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {withdrawalRequests.length > 0 ? (
              withdrawalRequests.map((withdrawal) => (
                <tr key={withdrawal._id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">
                      {withdrawal.user?.userName || "Unknown"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {withdrawal.user?.email || withdrawal.user}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(withdrawal.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <p>{withdrawal.bankDetailsSnapshot?.bankName || "Not set"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {withdrawal.bankDetailsSnapshot?.bankAccountNumber ||
                        "No account"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {withdrawal.bankDetailsSnapshot?.bankIFSCCode || "No IFSC"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {formatDateTime(withdrawal.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="min-w-[260px] px-4 py-3">
                    {withdrawal.status === "Pending" ? (
                      <div className="grid gap-2">
                        <input
                          type="text"
                          value={comments[withdrawal._id] || ""}
                          onChange={(event) =>
                            setComments((current) => ({
                              ...current,
                              [withdrawal._id]: event.target.value,
                            }))
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Admin comment"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleReview(withdrawal._id, "Approved")
                            }
                            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReview(withdrawal._id, "Rejected")
                            }
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {withdrawal.adminComment || "Reviewed"}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                  No withdrawal requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WithdrawalManagement;
