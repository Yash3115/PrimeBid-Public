const toPlainObject = (value) => {
  if (!value) return null;
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

const cleanString = (value) => {
  const cleaned = String(value || "").trim();
  return cleaned || undefined;
};

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  );

export const buildWinnerHandoff = (auction) => {
  const sellerValue = toPlainObject(auction?.createdBy);
  const seller =
    sellerValue && typeof sellerValue === "object" && !Array.isArray(sellerValue)
      ? sellerValue
      : null;
  const sellerName = cleanString(seller?.userName) || "the seller";

  return {
    status: "Ready for delivery handoff",
    seller: seller
      ? compactObject({
          userName: cleanString(seller.userName),
          email: cleanString(seller.email),
          phone: cleanString(seller.phone),
          ratingAverage: seller.reputation?.ratingAverage ?? 0,
          ratingCount: seller.reputation?.ratingCount ?? 0,
        })
      : null,
    payment: {
      method: "PrimeBid wallet",
      status: "Held in escrow until delivery is confirmed",
    },
    nextSteps: [
      `Add the delivery address where ${sellerName} should ship the item.`,
      "Track shipment updates from the seller inside your won auctions page.",
      "Keep item handoff and conversation records until delivery is complete.",
      "Leave seller feedback after the handoff is complete.",
    ],
  };
};
