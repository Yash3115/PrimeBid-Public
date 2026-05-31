const buildDate = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

const seller = {
  _id: "65f0000000000000000000a1",
  userName: "PrimeBid Verified Seller",
  reputation: {
    ratingAverage: 4.8,
    ratingCount: 24,
  },
};

export const buildDemoAuctionItems = () => [
  {
    _id: "65f000000000000000000101",
    title: "Vintage mechanical chronograph watch",
    description:
      "Serviced vintage chronograph with stainless steel case, original dial, leather strap, and documented maintenance history.",
    category: "Jewelry & Watches",
    condition: "Used",
    startingBid: 18000,
    currentBid: 24600,
    minimumBidIncrement: 500,
    antiSnipingExtensionMinutes: 2,
    startTime: buildDate(-60 * 60 * 1000),
    endTime: buildDate(3 * 60 * 60 * 1000),
    status: "Published",
    createdBy: seller,
    bids: [
      {
        userId: "65f000000000000000000201",
        userName: "Aarav",
        amount: 24600,
      },
      {
        userId: "65f000000000000000000202",
        userName: "Mira",
        amount: 24100,
      },
    ],
    image: { url: "" },
    createdAt: buildDate(-2 * 24 * 60 * 60 * 1000),
    updatedAt: buildDate(-20 * 60 * 1000),
  },
  {
    _id: "65f000000000000000000102",
    title: "Signed limited edition cricket memorabilia set",
    description:
      "Framed signed bat and match photo set with certificate, provenance note, and protective display case.",
    category: "Sports Memorabilia",
    condition: "Used",
    startingBid: 12000,
    currentBid: 12000,
    minimumBidIncrement: 250,
    antiSnipingExtensionMinutes: 2,
    startTime: buildDate(2 * 60 * 60 * 1000),
    endTime: buildDate(2 * 24 * 60 * 60 * 1000),
    status: "Published",
    createdBy: seller,
    bids: [],
    image: { url: "" },
    createdAt: buildDate(-24 * 60 * 60 * 1000),
    updatedAt: buildDate(-24 * 60 * 60 * 1000),
  },
  {
    _id: "65f000000000000000000103",
    title: "Restored mid-century lounge chair",
    description:
      "Walnut frame lounge chair with new upholstery, restored joints, detailed dimensions, and condition photos.",
    category: "Furniture",
    condition: "Used",
    startingBid: 28000,
    currentBid: 33500,
    minimumBidIncrement: 1000,
    antiSnipingExtensionMinutes: 3,
    startTime: buildDate(-2 * 24 * 60 * 60 * 1000),
    endTime: buildDate(6 * 60 * 60 * 1000),
    status: "Published",
    createdBy: seller,
    bids: [
      {
        userId: "65f000000000000000000203",
        userName: "Dev",
        amount: 33500,
      },
    ],
    image: { url: "" },
    createdAt: buildDate(-5 * 24 * 60 * 60 * 1000),
    updatedAt: buildDate(-90 * 60 * 1000),
  },
];

export const buildDemoMarketplaceResponse = () => {
  const now = new Date().toISOString();
  const items = buildDemoAuctionItems();

  return {
    success: true,
    demo: true,
    serverTime: now,
    items,
    count: items.length,
    message:
      "Showing demo marketplace data because the configured database is unavailable in this local environment.",
  };
};
