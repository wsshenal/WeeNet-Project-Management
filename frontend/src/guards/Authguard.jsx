import { Navigate } from "react-router-dom";

export const AuthGuard = ({ children }) => {
  const userLoggedIn = Boolean(localStorage.getItem("token"));
  if (userLoggedIn) {
    return <Navigate to="/requirement" replace />;
  }
  return children;
};

export const ProtectedRoute = ({ children }) => {
  const userLoggedIn = Boolean(localStorage.getItem("token"));
  if (!userLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
