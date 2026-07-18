import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const RouteLoading = () => (
  <p className="text-center text-white">Loading...</p>
);

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteLoading />;

  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace state={{ from: location }} />
  );
};

export const MasterRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { isMaster, status: userStatus } = useSelector((state) => state.user);
  const location = useLocation();

  const profileLoading =
    userStatus === "idle" || userStatus === "loading";

  if (authLoading || (user && profileLoading)) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!isMaster) {
    return (
      <Navigate
        to="/home"
        replace
        state={{ deniedFrom: location.pathname }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;