const toFiniteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toId = (value) => {
    if (!value) return "";
    return value.toString?.() || String(value);
};

export const findAutoBidByUser = (autoBids = [], userId) => {
    const requestedUserId = toId(userId);
    if (!requestedUserId) return null;

    return (
        (autoBids || []).find(
            (autoBid) => toId(autoBid.userId) === requestedUserId
        ) || null
    );
};

export const applyAutoBidLimit = ({
    auction,
    user,
    maxAmount,
    currentBidAmount = 0,
}) => {
    const userId = toId(user?._id || user?.id || user);
    if (!auction || !userId) {
        return { active: false, maxAmount: null, changed: false };
    }
    if (!Array.isArray(auction.autoBids)) {
        auction.autoBids = [];
    }

    const currentAmount = Math.max(toFiniteNumber(currentBidAmount), 0);
    const requestedMax = toFiniteNumber(maxAmount, NaN);
    const existingIndex = (auction.autoBids || []).findIndex(
        (autoBid) => toId(autoBid.userId) === userId
    );

    if (!Number.isFinite(requestedMax) || requestedMax <= currentAmount) {
        if (existingIndex >= 0) {
            auction.autoBids.splice(existingIndex, 1);
            return { active: false, maxAmount: null, changed: true };
        }
        return { active: false, maxAmount: null, changed: false };
    }

    if (existingIndex >= 0) {
        auction.autoBids[existingIndex].maxAmount = requestedMax;
    } else {
        auction.autoBids.push({
            userId: user._id || user.id || user,
            userName: user.userName,
            profileImage: user.profileImage?.url || user.profileImage,
            maxAmount: requestedMax,
        });
    }

    return { active: true, maxAmount: requestedMax, changed: true };
};

export const resolveAutoBidChallenge = ({
    currentBidderId,
    currentBid,
    currentBidderMax,
    increment = 1,
    autoBids = [],
}) => {
    const currentBidAmount = toFiniteNumber(currentBid);
    const bidIncrement = Math.max(toFiniteNumber(increment, 1), 1);
    const currentMax = Math.max(
        currentBidAmount,
        toFiniteNumber(currentBidderMax, currentBidAmount)
    );
    const currentUserId = toId(currentBidderId);
    const minimumAutoResponse = currentBidAmount + bidIncrement;

    const challenger = [...autoBids]
        .filter((autoBid) => {
            const autoBidderId = toId(autoBid.userId);
            const maxAmount = toFiniteNumber(autoBid.maxAmount);
            return (
                autoBidderId &&
                autoBidderId !== currentUserId &&
                maxAmount >= minimumAutoResponse
            );
        })
        .sort((a, b) => toFiniteNumber(b.maxAmount) - toFiniteNumber(a.maxAmount))[0];

    if (!challenger) {
        return null;
    }

    const challengerMax = toFiniteNumber(challenger.maxAmount);

    if (currentMax > challengerMax) {
        return {
            winner: "current",
            autoBid: challenger,
            autoMaxAmount: challengerMax,
            currentFinalAmount: Math.max(
                currentBidAmount,
                Math.min(currentMax, challengerMax + bidIncrement)
            ),
        };
    }

    return {
        winner: "auto",
        autoBid: challenger,
        autoFinalAmount: Math.max(
            minimumAutoResponse,
            Math.min(challengerMax, currentMax + bidIncrement)
        ),
    };
};
