import Spinner from "@/custom-components/Spinner";
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const AdminDashboard = lazy(() => import("./Dashboard/Dashboard"));

const RoleDashboard = () => {
  const { authChecked, isAuthenticated, user } = useSelector(
    (state) => state.user
  );

  if (!authChecked) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user.role === "Super Admin") {
    return (
      <Suspense fallback={<Spinner />}>
        <AdminDashboard />
      </Suspense>
    );
  }
  if (user.role === "Auctioneer") {
    return <Navigate to="/seller-dashboard" replace />;
  }
  if (user.role === "Bidder") {
    return <Navigate to="/bidder-dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};

export default RoleDashboard;
