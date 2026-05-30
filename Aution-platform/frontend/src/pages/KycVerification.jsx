/* eslint-disable react/prop-types */
import Spinner from "@/custom-components/Spinner";
import { submitKyc } from "@/store/slices/userSlice";
import { FileImage, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const KycVerification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { authChecked, isAuthenticated, loading, user } = useSelector(
    (state) => state.user
  );
  const [idProof, setIdProof] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigate("/");
    }
  }, [authChecked, isAuthenticated, navigate, user.role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("idProof", idProof);
    formData.append("selfie", selfie);
    if (addressProof) formData.append("addressProof", addressProof);

    setSubmitting(true);
    const result = await dispatch(submitKyc(formData));
    setSubmitting(false);
    if (result?.success) {
      setIdProof(null);
      setSelfie(null);
      setAddressProof(null);
    }
  };

  const status = user.kycStatus || "Not Submitted";
  const canSubmit = status !== "Approved" && idProof && selfie && !submitting;

  return (
    <section className="app-page">
      <div className="mx-auto w-full max-w-5xl">
        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="app-kicker">
                Auctioneer verification
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">
                KYC Verification
              </h1>
              <div className="mt-5 grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Current status
                    </p>
                    <p className="font-bold text-slate-950">{status}</p>
                  </div>
                </div>
                {status === "Approved" && (
                  <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    You can list auctions
                  </span>
                )}
              </div>
              {status === "Rejected" && user.kycRejectionReason && (
                <p className="mt-4 rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {user.kycRejectionReason}
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FileField
                  label="Government ID"
                  required
                  file={idProof}
                  onChange={setIdProof}
                />
                <FileField
                  label="Selfie / Live Photo"
                  required
                  file={selfie}
                  onChange={setSelfie}
                />
                <FileField
                  label="Address Proof"
                  file={addressProof}
                  onChange={setAddressProof}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-fit"
              >
                <Upload className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit KYC"}
              </button>
              {status === "Pending" && (
                <p className="mt-3 text-sm text-slate-500">
                  Submitting again will replace the documents currently waiting
                  for review.
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
};

const FileField = ({ label, required = false, file, onChange }) => (
  <label className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-4">
    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <FileImage className="h-4 w-4 text-indigo-600" />
      {label}
      {required && <span className="text-red-600">*</span>}
    </span>
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      required={required}
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
    />
    <span className="text-xs text-slate-500">
      {file?.name || "PNG, JPEG, or WebP up to 2MB."}
    </span>
  </label>
);

export default KycVerification;
