import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatCurrency } from "@/lib/format";
import { GiHamburgerMenu } from "react-icons/gi";
import { RiAuctionFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { ArrowDownToLine, ArrowUpFromLine, Gavel, ShieldCheck, X } from "lucide-react";
import {
  BiBarChartSquare,
  BiBell,
  BiCog,
  BiEnvelope,
  BiHeart,
  BiHistory,
  BiHomeAlt,
  BiInfoCircle,
  BiLogIn,
  BiLogOut,
  BiTrophy,
  BiUser,
  BiUserPlus,
  BiWallet,
} from "react-icons/bi";

const navLinkBase =
  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition";

const roleLinkBase =
  "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition";

const SideDrawer = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, unreadNotifications } = useSelector(
    (state) => state.user
  );
  const { wallet } = useSelector((state) => state.wallet);
  const canDeposit = user?.role === "Bidder";
  const canWithdraw = ["Auctioneer", "Bidder"].includes(user?.role);
  const showWalletCard = isAuthenticated && (canDeposit || canWithdraw);
  const availableBalance = Number(
    wallet.availableBalance ?? user?.wallet?.availableBalance ?? 0
  );
  const lockedBalance = Number(
    wallet.lockedBalance ?? user?.wallet?.lockedBalance ?? 0
  );
  const isActiveRoute = (to, aliases = []) => {
    const paths = [to, ...aliases].map((item) => item.split("#")[0]);
    return paths.some((path) =>
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
    );
  };
  const getNavClass = (to, aliases) =>
    `${navLinkBase} ${
      isActiveRoute(to, aliases)
        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
        : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700"
    }`;
  const getRoleClass = (to, aliases) =>
    `${roleLinkBase} ${
      isActiveRoute(to, aliases)
        ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
        : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  useEffect(() => {
    setShow(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!show) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShow(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label="Toggle navigation"
        aria-controls="primebid-navigation"
        aria-expanded={show}
        className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-xl text-white shadow-lg transition hover:bg-indigo-700 sm:left-5 sm:top-5 xl:hidden"
      >
        <GiHamburgerMenu />
      </button>

      {show && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm xl:hidden"
        />
      )}

      <aside
        id="primebid-navigation"
        className={`fixed left-0 top-0 z-40 flex h-dvh w-[min(88vw,320px)] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15 transition-transform duration-200 xl:w-[280px] xl:translate-x-0 xl:shadow-none ${
          show ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
              <Gavel className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-bold leading-tight text-slate-950">
                Prime<span className="text-indigo-600">Bid</span>
              </span>
              <span className="block truncate text-xs font-semibold text-slate-500">
                Wallet-backed auctions
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="Close navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 xl:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="mt-5 flex flex-1 flex-col gap-5">
          <div className="grid gap-1.5">
            <p className="px-3 text-xs font-bold uppercase text-slate-400 tracking-[0.12em]">
              Marketplace
            </p>
            <Link to="/" className={getNavClass("/")}>
              <BiHomeAlt /> Home
            </Link>
            <Link to="/auctions" className={getNavClass("/auctions")}>
              <RiAuctionFill /> Auctions
            </Link>
            <Link to="/watchlist" className={getNavClass("/watchlist")}>
              <BiHeart /> Watchlist
            </Link>
            <Link
              to="/recently-viewed"
              className={getNavClass("/recently-viewed")}
            >
              <BiHistory /> Recently Viewed
            </Link>
            <Link to="/leaderboard" className={getNavClass("/leaderboard")}>
              <MdLeaderboard /> Leaderboard
            </Link>
            {isAuthenticated && (
              <Link to="/notifications" className={getNavClass("/notifications")}>
                <BiBell /> Notifications
                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <div className="grid gap-1.5">
                <p className="px-3 text-xs font-bold uppercase text-slate-400 tracking-[0.12em]">
                  {user?.role === "Super Admin" ? "Operations" : "Workspace"}
                </p>

                {user?.role === "Super Admin" && (
                  <Link to="/dashboard" className={getRoleClass("/dashboard")}>
                    <BiBarChartSquare className="text-lg" />
                    Dashboard
                  </Link>
                )}

                {user?.role === "Auctioneer" && (
                  <>
                    <Link
                      to="/dashboard"
                      className={getRoleClass("/dashboard", ["/seller-dashboard"])}
                    >
                      <BiBarChartSquare className="text-lg" />
                      Dashboard
                    </Link>
                    <Link
                      to="/create-auction"
                      className={getRoleClass("/create-auction")}
                    >
                      <RiAuctionFill className="text-lg" />
                      Create Auction
                    </Link>
                    <Link
                      to="/view-my-auctions"
                      className={getRoleClass("/view-my-auctions")}
                    >
                      <BiCog className="text-lg" />
                      My Auctions
                    </Link>
                    <Link
                      to="/kyc-verification"
                      className={getRoleClass("/kyc-verification")}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      KYC
                    </Link>
                  </>
                )}

                {user?.role === "Bidder" && (
                  <>
                    <Link
                      to="/dashboard"
                      className={getRoleClass("/dashboard", ["/bidder-dashboard"])}
                    >
                      <BiBarChartSquare className="text-lg" />
                      Dashboard
                    </Link>
                    <Link to="/won-auctions" className={getRoleClass("/won-auctions")}>
                      <BiTrophy className="text-lg" />
                      Won Auctions
                    </Link>
                  </>
                )}
              </div>

              {showWalletCard && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase text-indigo-700 tracking-[0.12em]">
                      Wallet
                    </p>
                    <BiWallet className="text-xl text-indigo-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {formatCurrency(availableBalance)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {formatCurrency(lockedBalance)} locked in bids or payouts
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {canDeposit && (
                      <Link
                        to="/wallet#deposit"
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-2 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        Deposit
                      </Link>
                    )}
                    {canWithdraw && (
                      <Link
                        to="/wallet#withdraw"
                        className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 ${
                          canDeposit ? "" : "col-span-2"
                        }`}
                      >
                        <ArrowUpFromLine className="h-4 w-4" />
                        Withdraw
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-1.5">
                <p className="px-3 text-xs font-bold uppercase text-slate-400 tracking-[0.12em]">
                  Account
                </p>
                <div className="mb-1 flex min-w-0 items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
                  <BiUser className="shrink-0 text-xl text-indigo-600" />
                  <span className="truncate text-sm font-semibold text-slate-950">
                  {user?.userName}
                </span>
                </div>
                <Link to="/wallet" className={getNavClass("/wallet")}>
                  <BiWallet /> Wallet
                </Link>
                <Link to="/me" className={getNavClass("/me")}>
                  <BiCog /> Profile
                </Link>
                <Link to="/logout" className={getNavClass("/logout")}>
                  <BiLogOut /> Logout
                </Link>
              </div>
            </>
          ) : (
            <div className="grid gap-1.5">
              <p className="px-3 text-xs font-bold uppercase text-slate-400 tracking-[0.12em]">
                Account
              </p>
              <Link to="/login" className={getNavClass("/login")}>
                <BiLogIn /> Login
              </Link>
              <Link to="/sign-up" className={getNavClass("/sign-up")}>
                <BiUserPlus /> Sign Up
              </Link>
            </div>
          )}

          <div className="grid gap-1.5">
            <p className="px-3 text-xs font-bold uppercase text-slate-400 tracking-[0.12em]">
              Support
            </p>
            <Link to="/about" className={getNavClass("/about")}>
              <BiInfoCircle /> About
            </Link>
            <Link to="/contact" className={getNavClass("/contact")}>
              <BiEnvelope /> Contact
            </Link>
          </div>
        </nav>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-[0.12em]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Trust Layer
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            KYC sellers, wallet-backed bids, and visible settlement history keep every auction accountable.
          </p>
        </div>
      </aside>
    </>
  );
};

export default SideDrawer;
