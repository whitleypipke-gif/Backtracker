import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="text-center text-white">Loading...</p>; // Show while checking auth state

  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to="/"
      replace
      state={{
        from: location,
      }}
    />
  );
};

export default ProtectedRoute;
