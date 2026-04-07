import type { ReactNode } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { AdminPage } from "@/pages/admin-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { LoginPage } from "@/pages/login-page";
import { NotificationsPage } from "@/pages/notifications-page";
import { RegisterPage } from "@/pages/register-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { SettingsPage } from "@/pages/settings-page";
import { TenantStatusPage } from "@/pages/tenant-status-page";
import { VerifyEmailPage } from "@/pages/verify-email-page";

function RootRedirect() {
  const { loading, user } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return <div className="page-shell py-20">{t("common.loadingSession")}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === "super_admin" ? "/admin" : "/app"} replace />;
}

function ProtectedShell({ mode }: { mode: "workspace" | "admin" }) {
  const { loading, user } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return <div className="page-shell py-20">{t("common.loadingSession")}</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (mode === "admin" && user.role !== "super_admin") {
    return <Navigate to="/app" replace />;
  }
  return <AppShell mode={mode} />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return <div className="page-shell py-20">{t("common.loadingSession")}</div>;
  }
  if (user) {
    return <Navigate to={user.role === "super_admin" ? "/admin" : "/app"} replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/status/:tenantId" element={<TenantStatusPage />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicOnly>
              <ForgotPasswordPage />
            </PublicOnly>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnly>
              <ResetPasswordPage />
            </PublicOnly>
          }
        />

        <Route path="/app" element={<ProtectedShell mode="workspace" />}>
          <Route index element={<DashboardPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/admin" element={<ProtectedShell mode="admin" />}>
          <Route index element={<AdminPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
