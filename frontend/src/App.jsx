import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/auth/LoginPage";
import HomePage from "./pages/dashboard/HomePage";

import TicketAnalyticsPage from "./pages/reports/tickets/TicketAnalyticsPage";
import SatisfactionPage from "./pages/reports/satisfaction/SatisfactionPage";
import GlobalRmaPage from "./pages/reports/rma/GlobalRmaPage";
import AgentPerformancePage from "./pages/reports/agents/AgentPerformancePage";
import RushRmaPage from "./pages/reports/rush-rma/RushRmaPage";
import SocialPage from "./pages/reports/social/SocialPage";

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isAdminRole(user) {
  const role = normalizeRole(
    user?.role,
  );

  return [
    "admin",
    "owner",
    "super_admin",
    "super-admin",
  ].includes(role);
}

function DashboardIndexRoute() {
  const { user } = useAuth();

  if (!isAdminRole(user)) {
    return (
      <Navigate
        to="/reports/tickets"
        replace
      />
    );
  }

  return <HomePage />;
}

function AdminOnlyRoute({
  children,
}) {
  const { user } = useAuth();

  if (!isAdminRole(user)) {
    return (
      <Navigate
        to="/reports/tickets"
        replace
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <DashboardIndexRoute />
          }
        />

        <Route
          path="/reports/tickets"
          element={
            <ProtectedRoute permission="tickets:view">
              <TicketAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/satisfaction"
          element={
            <ProtectedRoute permission="satisfaction:view">
              <SatisfactionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/rma"
          element={
            <ProtectedRoute permission="rma:view">
              <GlobalRmaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/agents"
          element={
            <AdminOnlyRoute>
              <ProtectedRoute permission="agents:view">
                <AgentPerformancePage />
              </ProtectedRoute>
            </AdminOnlyRoute>
          }
        />

        <Route
          path="/reports/rush-rma"
          element={
            <ProtectedRoute permission="rush-rma:view">
              <RushRmaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/social"
          element={
            <ProtectedRoute permission="social:view">
              <SocialPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}