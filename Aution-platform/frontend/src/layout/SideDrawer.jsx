import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatCurrency } from "@/lib/format";
import { GiHamburgerMenu } from "react-icons/gi";
import { RiAuctionFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
  "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-base font-semibold transition sm:text-lg";

const roleLinkBase =
  "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition sm:text-base";

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

  return (
    <>
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label="Toggle navigation"
        className="fixed right-4 top-4 z-50 rounded-md bg-indigo-600 p-2 text-2xl text-white shadow-lg transition hover:bg-indigo-700 sm:right-5 sm:top-5 sm:text-3xl xl:hidden"
      >
        <GiHamburgerMenu />
      </button>

      {show && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 xl:hidden"
        />
      )}

      <aside
        className={`fixed top-0 z-40 flex h-dvh w-[min(86vw,320px)] flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 xl:left-0 xl:w-[300px] xl:shadow-none ${
          show ? "left-0" : "left-[-100%]"
        }`}
      >
        <div>
          <Link to="/">
            <h4 className="mb-4 text-2xl font-semibold">
              Prime<span className="text-indigo-600">Bid</span>
            </h4>
          </Link>

          <nav className="flex flex-col gap-1.5">
            <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Marketplace
            </p>
            <Link to="/auctions" className={getNavClass("/auctions")}>
              <RiAuctionFill /> Auctions
            </Link>
            <Link to="/leaderboard" className={getNavClass("/leaderboard")}>
              <MdLeaderboard /> Leaderboard
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
            <p className="mt-3 px-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Company
            </p>
            <Link to="/about" className={getNavClass("/about")}>
              <BiInfoCircle /> About
            </Link>
            <Link to="/contact" className={getNavClass("/contact")}>
              <BiEnvelope /> Contact
            </Link>
            <Link to="/" className={getNavClass("/")}>
              <BiHomeAlt /> Home
            </Link>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-3 pb-2">
          {isAuthenticated ? (
            <div className="flex flex-col gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <BiUser className="shrink-0 text-2xl" />
                <span className="truncate text-lg font-semibold text-indigo-600">
                  {user?.userName}
                </span>
              </div>

              {user?.role === "Super Admin" && (
                <Link to="/dashboard" className={getRoleClass("/dashboard")}>
                  Dashboard
                </Link>
              )}

              {user?.role === "Auctioneer" && (
                <>
                  <Link
                    to="/dashboard"
                    className={getRoleClass("/dashboard", ["/seller-dashboard"])}
                  >
                    <BiBarChartSquare className="mr-2 inline" />
                    Dashboard
                  </Link>
                  <Link
                    to="/kyc-verification"
                    className={getRoleClass("/kyc-verification")}
                  >
                    <BiCog className="mr-2 inline" />
                    KYC Verification
                  </Link>
                  <Link
                    to="/create-auction"
                    className={getRoleClass("/create-auction")}
                  >
                    Create Auction
                  </Link>
                  <Link
                    to="/view-my-auctions"
                    className={getRoleClass("/view-my-auctions")}
                  >
                    My Auctions
                  </Link>
                </>
              )}

              {user?.role === "Bidder" && (
                <>
                  <Link
                    to="/dashboard"
                    className={getRoleClass("/dashboard", ["/bidder-dashboard"])}
                  >
                    <BiBarChartSquare className="mr-2 inline" />
                    Dashboard
                  </Link>
                  <Link to="/won-auctions" className={getRoleClass("/won-auctions")}>
                    <BiTrophy className="mr-2 inline" />
                    Won Auctions
                  </Link>
                </>
              )}

              {showWalletCard && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-indigo-700">
                      Wallet
                    </p>
                    <BiWallet className="text-xl text-indigo-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {formatCurrency(availableBalance)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {formatCurrency(lockedBalance)} locked
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

              <hr className="border-t-indigo-600" />
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
          ) : (
            <>
              <Link to="/login" className={getNavClass("/login")}>
                <BiLogIn /> Login
              </Link>
              <Link to="/sign-up" className={getNavClass("/sign-up")}>
                <BiUserPlus /> Sign Up
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default SideDrawer;
