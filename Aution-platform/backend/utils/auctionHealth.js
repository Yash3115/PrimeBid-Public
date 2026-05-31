import { AUCTION_RUNTIME_STATUS, getAuctionTiming } from "./auctionStatus.js";

const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const toHours = (milliseconds) =>
  Number.isFinite(milliseconds) ? Math.round((milliseconds / 36_000) / 100) : null;

const pushUnique = (items, value) => {
  if (value && !items.includes(value)) items.push(value);
};

const getLabel = (score) => {
  if (score < 45) return { label: "At Risk", tone: "rose" };
  if (score < 70) return { label: "Needs Attention", tone: "amber" };
  return { label: "Healthy", tone: "emerald" };
};

export const buildAuctionHealth = (auction, options = {}) => {
  const now = options.now || new Date();
  const watcherCount = Number(options.watcherCount || 0);
  const timing = getAuctionTiming(auction, now);
  const bidCount = Array.isArray(auction?.bids)
    ? auction.bids.length
    : Number(auction?.bidCount || 0);
  const qualityScore = clamp(auction?.qualityScore || 0);
  const descriptionLength = String(auction?.description || "").trim().length;
  const hasImage = Boolean(auction?.image?.url);
  const hasCategory = Boolean(auction?.category);
  const hasCondition = Boolean(auction?.condition);
  const hasSchedule = Boolean(auction?.startTime && auction?.endTime);
  const recommendations = [];
  let score = 0;
  let summary = "Listing health is based on quality, timing, demand, and bid activity.";

  if (auction?.status === "Draft") {
    score = qualityScore;
    if (!hasImage) {
      score -= 15;
      pushUnique(recommendations, "Add a clear product image before publishing.");
    }
    if (!hasSchedule) {
      score -= 15;
      pushUnique(recommendations, "Set a start and end time to make this draft publish-ready.");
    }
    if (!hasCategory || !hasCondition) {
      score -= 10;
      pushUnique(recommendations, "Complete category and condition fields for better buyer confidence.");
    }
    if (descriptionLength < 120) {
      pushUnique(recommendations, "Add condition notes, accessories, defects, and proof details.");
    }

    const normalizedScore = clamp(score);
    return {
      score: normalizedScore,
      label: normalizedScore >= 70 ? "Draft Ready" : "Draft Needs Work",
      tone: normalizedScore >= 70 ? "indigo" : "amber",
      summary: normalizedScore >= 70
        ? "This draft has enough detail to publish confidently."
        : "This draft needs stronger details before publishing.",
      recommendations: recommendations.slice(0, 4),
      signals: {
        runtimeStatus: "Draft",
        bidCount,
        watcherCount,
        qualityScore,
        descriptionLength,
        hoursRemaining: null,
      },
    };
  }

  if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.INVALID) {
    return {
      score: 10,
      label: "At Risk",
      tone: "rose",
      summary: "This auction has an invalid schedule and cannot perform reliably.",
      recommendations: ["Fix the auction start and end time."],
      signals: {
        runtimeStatus: timing.runtimeStatus,
        bidCount,
        watcherCount,
        qualityScore,
        descriptionLength,
        hoursRemaining: null,
      },
    };
  }

  if (!hasImage) pushUnique(recommendations, "Add a high-quality image to improve buyer trust.");
  if (descriptionLength < 120) pushUnique(recommendations, "Expand the description with proof, dimensions, defects, and included items.");
  if (qualityScore < 60) pushUnique(recommendations, "Improve listing quality before the auction reaches its final hours.");

  const hoursRemaining = toHours(timing.timeUntilEndMs);
  const bidScore = Math.min(bidCount * 12, 30);
  const watcherScore = Math.min(watcherCount * 5, 15);
  const imageScore = hasImage ? 8 : 0;
  const metadataScore = (hasCategory ? 4 : 0) + (hasCondition ? 4 : 0);
  score = qualityScore * 0.35 + bidScore + watcherScore + imageScore + metadataScore;

  if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.UPCOMING) {
    score += 15;
    summary = "Upcoming auction readiness is based on listing quality and early interest.";
    if (watcherCount === 0) {
      pushUnique(recommendations, "Share or promote this auction before it starts to build early watchers.");
    }
  }

  if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.LIVE) {
    summary = "Live auction health is based on bids, watchers, listing quality, and remaining time.";
    if (bidCount > 0) {
      score += 15;
    } else {
      score -= hoursRemaining !== null && hoursRemaining <= 6 ? 25 : hoursRemaining <= 24 ? 15 : 5;
      pushUnique(recommendations, "No bids yet. Consider promoting the auction or lowering the opening bid next time.");
    }

    if (watcherCount >= 3 && bidCount === 0) {
      score -= 10;
      pushUnique(recommendations, "Several buyers are watching but not bidding; add proof details or clarify value.");
    }

    if (hoursRemaining !== null && hoursRemaining <= 6 && bidCount === 0) {
      pushUnique(recommendations, "Auction is closing soon with no bids. Highlight it in your seller channels now.");
    }
  }

  if (timing.runtimeStatus === AUCTION_RUNTIME_STATUS.ENDED) {
    const sold = bidCount > 0;
    return {
      score: sold ? 85 : 35,
      label: sold ? "Completed" : "Ended Without Bids",
      tone: sold ? "emerald" : "slate",
      summary: sold
        ? "This auction generated bids and completed with buyer interest."
        : "This auction ended without bids. Review pricing, photos, and listing details before republishing.",
      recommendations: sold
        ? []
        : [
            "Republish with a stronger title, lower opening bid, or richer proof details.",
            "Choose an ending time when bidders are more likely to be active.",
          ],
      signals: {
        runtimeStatus: timing.runtimeStatus,
        bidCount,
        watcherCount,
        qualityScore,
        descriptionLength,
        hoursRemaining: 0,
      },
    };
  }

  const normalizedScore = clamp(score);
  const label = getLabel(normalizedScore);

  return {
    score: normalizedScore,
    ...label,
    summary,
    recommendations: recommendations.slice(0, 4),
    signals: {
      runtimeStatus: timing.runtimeStatus,
      bidCount,
      watcherCount,
      qualityScore,
      descriptionLength,
      hoursRemaining,
    },
  };
};
