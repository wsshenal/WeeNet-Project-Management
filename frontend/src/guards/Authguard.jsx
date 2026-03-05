import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthGuard = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const userLoggedIn = Boolean(localStorage.getItem("token"));
    if (userLoggedIn) {
      navigate("/requirement");
    }
  }, [navigate]);

  return children;
};

export const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const userLoggedIn = Boolean(localStorage.getItem("token"));
    if (!userLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  return children;
};
