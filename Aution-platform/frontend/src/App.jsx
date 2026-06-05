import { lazy, Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import SideDrawer from "./layout/SideDrawer";
import ErrorBoundary from "./custom-components/ErrorBoundary";
import ProtectedRoute from "./custom-components/ProtectedRoute";
import RouteUtilities from "./custom-components/RouteUtilities";
import Spinner from "./custom-components/Spinner";
import DemoModeBanner from "./custom-components/DemoModeBanner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchLeaderboard,
  fetchNotifications,
  fetchUser,
  fetchWatchlist,
  sessionExpired,
} from "./store/slices/userSlice";
import { getAllAuctionItems } from "./store/slices/auctionSlice";
import { fetchWallet, resetWallet } from "./store/slices/walletSlice";
import { AUTH_SESSION_EXPIRED_EVENT } from "./lib/authEvents";
import { clearAuthToken } from "./lib/authToken";
import { clearDemoConversion } from "./lib/demoMode";

const Home = lazy(() => import("./pages/Home"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Login = lazy(() => import("./pages/Login"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const About = lazy(() => import("./pages/About"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Auctions = lazy(() => import("./pages/Auctions"));
const AuctionItem = lazy(() => import("./pages/AuctionItem"));
const CreateAuction = lazy(() => import("./pages/CreateAuction"));
const ViewMyAuctions = lazy(() => import("./pages/ViewMyAuctions"));
const ViewAuctionDetails = lazy(() => import("./pages/ViewAuctionDetails"));
const RoleDashboard = lazy(() => import("./pages/RoleDashboard"));
const Contact = lazy(() => import("./pages/Contact"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Logout = lazy(() => import("./pages/Logout"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const RecentlyViewed = lazy(() => import("./pages/RecentlyViewed"));
const Notifications = lazy(() => import("./pages/Notifications"));
const WonAuctions = lazy(() => import("./pages/WonAuctions"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const BidderDashboard = lazy(() => import("./pages/BidderDashboard"));
const KycVerification = lazy(() => import("./pages/KycVerification"));
const Wallet = lazy(() => import("./pages/Wallet"));
const NotFound = lazy(() => import("./pages/NotFound"));

const protectedRoutePrefixes = [
  "/auction/details/",
  "/create-auction",
  "/dashboard",
  "/bidder-dashboard",
  "/me",
  "/notifications",
  "/seller-dashboard",
  "/kyc-verification",
  "/view-my-auctions",
  "/watchlist",
  "/wallet",
  "/won-auctions",
];

const SessionExpiredHandler = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const authenticatedAt = useSelector((state) => state.user.authenticatedAt);
  const authenticatedAtRef = useRef(authenticatedAt);

  useEffect(() => {
    authenticatedAtRef.current = authenticatedAt;
  }, [authenticatedAt]);

  useEffect(() => {
    const handleSessionExpired = (event) => {
      const message =
        event.detail?.message || "Session expired. Please login again";
      const requestStartedAt = event.detail?.requestStartedAt;

      if (
        authenticatedAtRef.current &&
        requestStartedAt &&
        requestStartedAt < authenticatedAtRef.current
      ) {
        return;
      }

      clearAuthToken();
      clearDemoConversion();
      dispatch(sessionExpired());
      dispatch(resetWallet());
      toast.error(message, { toastId: "session-expired" });

      const isProtectedRoute = protectedRoutePrefixes.some((routePrefix) =>
        location.pathname.startsWith(routePrefix)
      );

      if (isProtectedRoute && location.pathname !== "/login") {
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired
      );
    };
  }, [dispatch, location.pathname, navigate]);

  return null;
};

const App = () => {
  const dispatch = useDispatch();
  const { authChecked, isAuthenticated } = useSelector((state) => state.user);
  useEffect(() => {
    dispatch(fetchUser());
    dispatch(getAllAuctionItems());
    dispatch(fetchLeaderboard());
  }, [dispatch]);

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      dispatch(fetchWatchlist());
      dispatch(fetchNotifications());
      dispatch(fetchWallet());
      const interval = setInterval(() => dispatch(fetchNotifications()), 30000);
      return () => clearInterval(interval);
    }
  }, [authChecked, dispatch, isAuthenticated]);
  return (
    <Router>
      <SessionExpiredHandler />
      <RouteUtilities />
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[80] rounded-md bg-slate-950 px-4 py-3 font-semibold text-white shadow-lg focus:not-sr-only"
      >
        Skip to main content
      </a>
      <SideDrawer />
      <DemoModeBanner />
      <ErrorBoundary>
        <Suspense fallback={<Spinner />}>
          <main id="main-content" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/how-it-works-info" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/auctions" element={<Auctions />} />
              <Route path="/recently-viewed" element={<RecentlyViewed />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/watchlist"
                element={
                  <ProtectedRoute>
                    <Watchlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <Wallet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/won-auctions"
                element={
                  <ProtectedRoute allowedRoles={["Bidder"]}>
                    <WonAuctions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["Auctioneer"]}>
                    <SellerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bidder-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["Bidder"]}>
                    <BidderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kyc-verification"
                element={
                  <ProtectedRoute allowedRoles={["Auctioneer"]}>
                    <KycVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auction/item/:id"
                element={<AuctionItem />}
              />
              <Route
                path="/create-auction"
                element={
                  <ProtectedRoute allowedRoles={["Auctioneer"]}>
                    <CreateAuction />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-my-auctions"
                element={
                  <ProtectedRoute allowedRoles={["Auctioneer"]}>
                    <ViewMyAuctions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auction/details/:id"
                element={
                  <ProtectedRoute allowedRoles={["Auctioneer", "Super Admin"]}>
                    <ViewAuctionDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </Suspense>
      </ErrorBoundary>
      <ToastContainer position="top-right" />
    </Router>
  );
};

export default App;
