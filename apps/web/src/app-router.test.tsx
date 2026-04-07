import { render, screen, waitFor } from "@testing-library/react";
import { Outlet } from "react-router-dom";

import { AppRouter } from "@/app";
import { I18nProvider } from "@/lib/i18n";

type TestUser = {
  id: number;
  tenant_id: number;
  username: string;
  email: string;
  role: "super_admin" | "tenant_owner";
  email_verified: boolean;
};

const authState = vi.hoisted((): { loading: boolean; user: TestUser } => ({
  loading: false,
  user: {
    id: 1,
    tenant_id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "super_admin" as const,
    email_verified: true,
  },
}));

const logoutMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    loading: authState.loading,
    user: authState.user,
    logout: logoutMock,
  }),
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ mode }: { mode?: "workspace" | "admin" }) => (
    <div>
      <div data-testid="shell-mode">{mode}</div>
      <Outlet />
    </div>
  ),
}));

vi.mock("@/pages/admin-page", () => ({
  AdminPage: () => <div>admin page</div>,
}));

vi.mock("@/pages/dashboard-page", () => ({
  DashboardPage: () => <div>dashboard page</div>,
}));

vi.mock("@/pages/notifications-page", () => ({
  NotificationsPage: () => <div>notifications page</div>,
}));

vi.mock("@/pages/settings-page", () => ({
  SettingsPage: () => <div>settings page</div>,
}));

vi.mock("@/pages/login-page", () => ({
  LoginPage: () => <div>login page</div>,
}));

vi.mock("@/pages/register-page", () => ({
  RegisterPage: () => <div>register page</div>,
}));

vi.mock("@/pages/forgot-password-page", () => ({
  ForgotPasswordPage: () => <div>forgot password page</div>,
}));

vi.mock("@/pages/reset-password-page", () => ({
  ResetPasswordPage: () => <div>reset password page</div>,
}));

vi.mock("@/pages/verify-email-page", () => ({
  VerifyEmailPage: () => <div>verify email page</div>,
}));

vi.mock("@/pages/tenant-status-page", () => ({
  TenantStatusPage: () => <div>tenant status page</div>,
}));

describe("AppRouter", () => {
  beforeEach(() => {
    authState.loading = false;
    authState.user = {
      id: 1,
      tenant_id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "super_admin",
      email_verified: true,
    };
    logoutMock.mockReset();
  });

  it("allows super admins to open workspace routes without redirecting back to admin", async () => {
    window.history.pushState({}, "", "/app");

    render(
      <I18nProvider>
        <AppRouter />
      </I18nProvider>
    );

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
    expect(screen.getByTestId("shell-mode")).toHaveTextContent("workspace");
    expect(window.location.pathname).toBe("/app");
  });

  it("keeps non-admin users out of the admin route", async () => {
    authState.user = {
      id: 2,
      tenant_id: 2,
      username: "owner",
      email: "",
      role: "tenant_owner",
      email_verified: false,
    };

    window.history.pushState({}, "", "/admin");

    render(
      <I18nProvider>
        <AppRouter />
      </I18nProvider>
    );

    await waitFor(() => expect(window.location.pathname).toBe("/app"));
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });
});
