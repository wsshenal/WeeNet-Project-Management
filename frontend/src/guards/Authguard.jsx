import { Navigate } from "react-router-dom";

export const AuthGuard = ({ children }) => {
  // Bypass login: directly return to home page
  return <Navigate to="/requirement" replace />;
};

export const ProtectedRoute = ({ children }) => {
  // Bypass protection: always allow access
  return children;
};
