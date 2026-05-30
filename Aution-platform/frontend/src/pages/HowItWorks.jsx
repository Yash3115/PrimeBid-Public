import {
  BadgeCheck,
  BadgeIndianRupee,
  Gavel,
  RotateCcw,
  UserPlus,
  Wallet,
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Create an account",
      description:
        "Register as a bidder or auctioneer so PrimeBid can show the right actions and account tools.",
    },
    {
      icon: Gavel,
      title: "List or bid",
      description:
        "Auctioneers publish lots with start and end times. Bidders place offers while the auction is live.",
    },
    {
      icon: BadgeCheck,
      title: "Auction closes",
      description:
        "When time expires, the highest bidder becomes the winner and the seller can review bid activity.",
    },
    {
      icon: Wallet,
      title: "Wallet payment",
      description:
        "Bidders fund their wallet before bidding, and the winning locked amount is captured when the auction closes.",
    },
    {
      icon: BadgeIndianRupee,
      title: "Automatic settlement",
      description:
        "PrimeBid deducts the platform fee from the winning bid and credits the remaining sale proceeds to the seller wallet.",
    },
    {
      icon: RotateCcw,
      title: "Republish if needed",
      description:
        "Ended auctions can be republished with new dates when a seller needs another bidding window.",
    },
  ];

  return (
    <section className="app-page">
      <div className="app-container flex flex-col gap-8">
        <div>
          <p className="app-kicker">
            Process
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
            How PrimeBid works from listing to settlement.
          </h1>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-slate-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                {title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
