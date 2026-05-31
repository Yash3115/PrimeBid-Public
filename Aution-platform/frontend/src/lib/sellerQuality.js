export const SELLER_RISK_LEVEL = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const sellerRiskTone = {
  [SELLER_RISK_LEVEL.LOW]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [SELLER_RISK_LEVEL.MEDIUM]: "border-amber-200 bg-amber-50 text-amber-700",
  [SELLER_RISK_LEVEL.HIGH]: "border-red-200 bg-red-50 text-red-700",
};

export const trustBadgeTone = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  red: "border-red-200 bg-red-50 text-red-700",
};

export const formatPercent = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.round(number * 100)}%`;
};

export const getSellerQuality = (auctionOrSeller = {}) => {
  if (auctionOrSeller?.sellerQuality) return auctionOrSeller.sellerQuality;
  if (auctionOrSeller?.createdBy?.sellerQuality) {
    return auctionOrSeller.createdBy.sellerQuality;
  }
  return null;
};

export const getTrustBadgeClass = (tone) =>
  trustBadgeTone[tone] || trustBadgeTone.slate;

export const getSellerRiskClass = (riskLevel) =>
  sellerRiskTone[riskLevel] || sellerRiskTone[SELLER_RISK_LEVEL.LOW];

export const getSellerRiskSummary = (quality) => {
  if (!quality) return "Seller quality is being calculated.";
  if (quality.riskLevel === SELLER_RISK_LEVEL.HIGH) {
    return quality.reasons?.[0] || "Admin review recommended.";
  }
  if (quality.riskLevel === SELLER_RISK_LEVEL.MEDIUM) {
    return quality.reasons?.[0] || "Some seller quality signals need attention.";
  }
  return quality.reasons?.[0] || "No significant seller quality issues detected.";
};

export const normalizeTrustBadges = (quality, fallbackSeller = {}) => {
  if (Array.isArray(quality?.trustBadges) && quality.trustBadges.length > 0) {
    return quality.trustBadges;
  }
  if (fallbackSeller?.kycStatus === "Approved") {
    return [
      {
        id: "verified-seller",
        label: "Verified seller",
        tone: "emerald",
        description: "Auctioneer KYC is approved.",
      },
    ];
  }
  return [
    {
      id: "new-seller",
      label: "New seller",
      tone: "slate",
      description: "Limited completed-sale history on PrimeBid.",
    },
  ];
};
