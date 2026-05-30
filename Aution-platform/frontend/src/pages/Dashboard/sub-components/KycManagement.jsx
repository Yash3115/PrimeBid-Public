/* eslint-disable react/prop-types */
import { formatDateTime } from "@/lib/format";
import {
  getKycSubmissions,
  updateKycStatus,
} from "@/store/slices/superAdminSlice";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const KycManagement = () => {
  const dispatch = useDispatch();
  const { kycSubmissions } = useSelector((state) => state.superAdmin);
  const [status, setStatus] = useState("Pending");
  const [rejectionReasons, setRejectionReasons] = useState({});

  useEffect(() => {
    dispatch(getKycSubmissions(status));
  }, [dispatch, status]);

  const handleReject = (userId) => {
    dispatch(updateKycStatus(userId, "Rejected", rejectionReasons[userId] || "", status));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Review auctioneer identity documents before they can list items.
        </p>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Approved">Approved</option>
          <option value="Not Submitted">Not Submitted</option>
        </select>
      </div>

      {kycSubmissions.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          No auctioneer KYC records for this status.
        </div>
      ) : (
        <div className="grid gap-4">
          {kycSubmissions.map((user) => (
            <article
              key={user._id}
              className="grid gap-4 rounded-md border border-slate-200 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="font-semibold text-slate-950">{user.userName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Submitted:{" "}
                    {user.kycSubmittedAt
                      ? formatDateTime(user.kycSubmittedAt)
                      : "Not submitted"}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                  {user.kycStatus || "Not Submitted"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <DocumentLink label="ID Proof" file={user.kycDocuments?.idProof} />
                <DocumentLink label="Selfie" file={user.kycDocuments?.selfie} />
                <DocumentLink
                  label="Address Proof"
                  file={user.kycDocuments?.addressProof}
                />
              </div>

              {user.kycStatus === "Rejected" && user.kycRejectionReason && (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {user.kycRejectionReason}
                </p>
              )}

              {user.kycStatus === "Pending" && (
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <input
                    value={rejectionReasons[user._id] || ""}
                    onChange={(event) =>
                      setRejectionReasons((current) => ({
                        ...current,
                        [user._id]: event.target.value,
                      }))
                    }
                    placeholder="Reason required only if rejecting"
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(updateKycStatus(user._id, "Approved", "", status))
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(user._id)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentLink = ({ label, file }) => (
  <a
    href={file?.url || "#"}
    target="_blank"
    rel="noreferrer"
    className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
      file?.url
        ? "border-slate-300 text-slate-800 hover:border-indigo-300 hover:text-indigo-700"
        : "pointer-events-none border-slate-200 text-slate-400"
    }`}
  >
    <ExternalLink className="h-4 w-4" />
    {label}
  </a>
);

export default KycManagement;
