import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { I18nProvider } from "@/lib/i18n";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      tenant_id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "super_admin",
      email_verified: true,
    },
    logout: vi.fn(),
  }),
}));

describe("AppShell", () => {
  it("shows admin navigation for super admins", () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/app"]}>
          <AppShell />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
  });
});
