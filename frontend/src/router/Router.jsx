import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/Layouts";
import Team from "../pages/Content/Team";
import Complexity from "../pages/Content/Complexity";
import Login from "../pages/Login";
import Register from "../pages/Register";
import AddEmployee from "../pages/Content/AddEmployee";
import ViewEmployee from "../pages/Content/ViewEmployee";
import ViewKPI from "../pages/Content/ViewKPI";
import SkillInfo from "../pages/Content/SkillInfo";
import RiskType from "../pages/Content/RiskType";
import Crud from "../pages/Content/Crud";
import Requirements from "../pages/Content/Requirement";
import { AuthGuard, ProtectedRoute } from "../guards/Authguard";
import Projects from "../pages/Content/Projects";
import SDLC from "../pages/Content/SDLC";

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <AuthGuard>
        <Login />
      </AuthGuard>
    ),
  },
  {
    path: "/register",
    element: (
      <AuthGuard>
        <Register />
      </AuthGuard>
    ),
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "requirement",
        element: (
          <ProtectedRoute>
            <Requirements />
          </ProtectedRoute>
        ),
      },
      {
        path: "add-employee",
        element: (
          <ProtectedRoute>
            <AddEmployee />
          </ProtectedRoute>
        ),
      },
      {
        path: "view-employee",
        element: (
          <ProtectedRoute>
            <ViewEmployee />
          </ProtectedRoute>
        ),
      },
      {
        path: "view-KPI",
        element: (
          <ProtectedRoute>
            <ViewKPI />
          </ProtectedRoute>
        ),
      },
      {
        path: "skill",
        element: (
          <ProtectedRoute>
            <SkillInfo />
          </ProtectedRoute>
        ),
      },
      {
        path: "team",
        element: (
          <ProtectedRoute>
            <Team />
          </ProtectedRoute>
        ),
      },
      {
        path: "complexity",
        element: (
          <ProtectedRoute>
            <Complexity />
          </ProtectedRoute>
        ),
      },
      {
        path: "risk-type",
        element: (
          <ProtectedRoute>
            <RiskType />
          </ProtectedRoute>
        ),
      },
      {
        path: "crud",
        element: (
          <ProtectedRoute>
            <Crud />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects",
        element: (
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        ),
      },
      {
        path: "sdlc",
        element: (
          <ProtectedRoute>
            <SDLC />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
