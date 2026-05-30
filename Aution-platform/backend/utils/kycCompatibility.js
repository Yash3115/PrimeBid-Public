const VALID_KYC_STATUSES = ["Not Submitted", "Pending", "Approved", "Rejected"];

const missingOrInvalidKycStatusFilter = () => ({
    $or: [
        { kycStatus: { $exists: false } },
        { kycStatus: null },
        { kycStatus: { $nin: VALID_KYC_STATUSES } },
    ],
});

export const buildKycCompatibilityUpdates = (reviewedAt = new Date()) => [
    {
        name: "legacy auctioneers approved",
        filter: {
            role: "Auctioneer",
            ...missingOrInvalidKycStatusFilter(),
        },
        update: {
            $set: {
                kycStatus: "Approved",
                kycRejectionReason: "",
                kycReviewedAt: reviewedAt,
            },
        },
    },
    {
        name: "non-auctioneer accounts marked not required",
        filter: {
            role: { $in: ["Bidder", "Super Admin"] },
            ...missingOrInvalidKycStatusFilter(),
        },
        update: {
            $set: {
                kycStatus: "Approved",
                kycRejectionReason: "",
            },
        },
    },
];

export const backfillKycCompatibility = async (
    UserModel,
    { reviewedAt = new Date(), dryRun = false } = {}
) => {
    const updates = buildKycCompatibilityUpdates(reviewedAt);
    const results = [];

    for (const item of updates) {
        const matched = await UserModel.countDocuments(item.filter);
        let modified = 0;

        if (!dryRun && matched > 0) {
            const result = await UserModel.updateMany(item.filter, item.update);
            modified = result.modifiedCount || 0;
        }

        results.push({
            name: item.name,
            matched,
            modified,
            dryRun,
        });
    }

    return results;
};

export { VALID_KYC_STATUSES };
