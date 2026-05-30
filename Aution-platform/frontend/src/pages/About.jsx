import { ShieldCheck, Sparkles, UsersRound, WalletCards } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: ShieldCheck,
      title: "Integrity",
      description:
        "Clear bidding windows, visible prices, and account-based workflows keep auctions fair.",
    },
    {
      icon: Sparkles,
      title: "Innovation",
      description:
        "PrimeBid keeps auction discovery, bidding, and seller tools in one practical workspace.",
    },
    {
      icon: UsersRound,
      title: "Community",
      description:
        "Bidders and auctioneers can connect around items with transparent activity and outcomes.",
    },
    {
      icon: WalletCards,
      title: "Trust",
      description:
        "Wallet locks, automatic settlement, and role-based controls help keep transactions accountable.",
    },
  ];

  return (
    <section className="app-page">
      <div className="app-container flex flex-col gap-10">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="app-kicker">
            About PrimeBid
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
            A focused auction platform for bidders and sellers.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            PrimeBid helps auctioneers publish items, bidders compete for lots,
            and administrators track wallet settlement from one consistent
            marketplace.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
              Our Mission
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              We aim to make online auctions easier to run and easier to trust:
              clear listings, simple bidding, role-aware tools, and direct
              visibility into wallet and payout workflows.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-6 text-indigo-950">
          <h2 className="text-xl font-semibold">Join the marketplace</h2>
          <p className="mt-2 leading-7">
            Whether you are listing items or competing for them, PrimeBid gives
            you a clearer place to manage the auction journey.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
