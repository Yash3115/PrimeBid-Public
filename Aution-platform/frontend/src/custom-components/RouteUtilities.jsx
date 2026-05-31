import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getHashTargetId } from "@/lib/navigation";

const pageTitles = {
  "/": "Home",
  "/about": "About",
  "/auctions": "Auctions",
  "/bidder-dashboard": "Bidder Dashboard",
  "/contact": "Contact",
  "/create-auction": "Create Auction",
  "/dashboard": "Dashboard",
  "/how-it-works-info": "How It Works",
  "/kyc-verification": "KYC Verification",
  "/leaderboard": "Leaderboard",
  "/login": "Login",
  "/me": "Profile",
  "/notifications": "Notifications",
  "/recently-viewed": "Recently Viewed",
  "/seller-dashboard": "Seller Dashboard",
  "/sign-up": "Sign Up",
  "/view-my-auctions": "My Auctions",
  "/wallet": "Wallet",
  "/watchlist": "Watchlist",
  "/won-auctions": "Won Auctions",
};

const getPageTitle = (pathname) => {
  if (pathname.startsWith("/auction/item/")) return "Auction Details";
  if (pathname.startsWith("/auction/details/")) return "Seller Auction Details";
  return pageTitles[pathname] || "PrimeBid";
};

const RouteUtilities = () => {
  const location = useLocation();
  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    document.title = `${pageTitle} | PrimeBid`;
    const targetId = getHashTargetId(location.hash);

    if (!targetId) {
      window.scrollTo(0, 0);
      return undefined;
    }

    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      target.scrollIntoView({ block: "start" });
      return true;
    };

    const timeoutIds = [];
    const frameId = window.requestAnimationFrame(() => {
      if (scrollToTarget()) return;
      timeoutIds.push(window.setTimeout(scrollToTarget, 120));
      timeoutIds.push(window.setTimeout(scrollToTarget, 360));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [location.hash, location.pathname, pageTitle]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      Navigated to {pageTitle}
    </div>
  );
};

export default RouteUtilities;
