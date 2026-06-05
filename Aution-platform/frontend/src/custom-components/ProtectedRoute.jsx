import Spinner from "@/custom-components/Spinner";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

/* eslint-disable react/prop-types */
const roleHome = {
  "Super Admin": "/dashboard",
  Auctioneer: "/seller-dashboard",
  Bidder: "/bidder-dashboard",
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const location = useLocation();
  const { authChecked, isAuthenticated, user } = useSelector(
    (state) => state.user
  );

  if (!authChecked) return <Spinner />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={roleHome[user?.role] || "/"} replace />;
  }

  return children;
};

export default ProtectedRoute;