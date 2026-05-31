import {
  requireSellerKycReview,
  updateUserStatus,
  warnSellerRisk,
} from "@/store/slices/superAdminSlice";
import {
  formatPercent,
  getSellerRiskClass,
  getTrustBadgeClass,
} from "@/lib/sellerQuality";
import { AlertTriangle, BadgeCheck, PauseCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

/* eslint-disable react/prop-types */

const defaultWarning =
  "Your seller quality score needs attention. Please resolve open delivery issues, ship ready orders promptly, and communicate with buyers.";

const SellerRiskManagement = () => {
  const dispatch = useDispatch();
  const sellers = useSelector(
    (state) => state.superAdmin.overview?.sellerRisk?.sellers || []
  );
  const [notes, setNotes] = useState({});

  const handleWarn = (seller) => {
    dispatch(warnSellerRisk(seller.sellerId, notes[seller.sellerId] || defaultWarning));
  };

  const handlePause = (seller) => {
    const confirmed = window.confirm(
      `Pause ${seller.userName}'s auctioneer account? They will not be able to operate normally until reactivated.`
    );
    if (!confirmed) return;
    dispatch(updateUserStatus(seller.sellerId, "Paused"));
  };

  const handleKycReview = (seller) => {
    const confirmed = window.confirm(
      `Move ${seller.userName} to KYC re-review? This will block new listings until approved again.`
    );
    if (!confirmed) return;
    dispatch(
      requireSellerKycReview(
        seller.sellerId,
        notes[seller.sellerId] ||
          "Admin requested KYC re-review because seller quality risk increased."
      )
    );
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SellerRiskSummary
          label="Tracked sellers"
          value={sellers.length}
          detail="Auctioneers with quality profiles"
        />
        <SellerRiskSummary
          label="High risk"
          value={sellers.filter((seller) => seller.riskLevel === "High").length}
          detail="Needs immediate admin attention"
        />
        <SellerRiskSummary
          label="Medium risk"
          value={sellers.filter((seller) => seller.riskLevel === "Medium").length}
          detail="Watch and coach"
        />
      </div>

      {sellers.length > 0 ? (
        <div className="grid gap-4">
          {sellers.map((seller) => (
            <article
              key={seller.sellerId}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">
                        {seller.userName}
                      </h3>
                      <p className="text-sm text-slate-500">{seller.email}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-md border px-3 py-2 text-sm font-bold ${getSellerRiskClass(
                        seller.riskLevel
                      )}`}
                    >
                      {seller.riskLevel} risk - {seller.riskScore}/100
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniRiskMetric
                      label="Dispute rate"
                      value={formatPercent(seller.disputeRate)}
                    />
                    <MiniRiskMetric
                      label="Refund rate"
                      value={formatPercent(seller.refundRate)}
                    />
                    <MiniRiskMetric
                      label="Open disputes"
                      value={seller.openDisputes || 0}
                    />
                    <MiniRiskMetric
                      label="Completed sales"
                      value={seller.completedSales || 0}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(seller.trustBadges || []).map((badge) => (
                      <span
                        key={badge.id}
                        className={`rounded-md border px-2.5 py-1 text-xs font-bold ${getTrustBadgeClass(
                          badge.tone
                        )}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Risk reasons
                    </p>
                    <ul className="mt-2 grid gap-1 text-sm text-slate-700">
                      {(seller.reasons || []).slice(0, 4).map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid content-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Admin note
                    </span>
                    <textarea
                      rows={4}
                      value={notes[seller.sellerId] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [seller.sellerId]: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder={defaultWarning}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleWarn(seller)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-amber-700"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Warn Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePause(seller)}
                    disabled={seller.accountStatus === "Paused"}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    <PauseCircle className="h-4 w-4" />
                    {seller.accountStatus === "Paused" ? "Already Paused" : "Pause Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKycReview(seller)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Require KYC Review
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          Seller risk profiles will appear after auctioneers join the platform.
        </div>
      )}
    </div>
  );
};

const SellerRiskSummary = ({ label, value, detail }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    <p className="mt-1 text-sm text-slate-500">{detail}</p>
  </div>
);

const MiniRiskMetric = ({ label, value }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
  </div>
);

export default SellerRiskManagement;
