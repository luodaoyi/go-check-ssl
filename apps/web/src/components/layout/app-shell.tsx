import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeftRight, Bell, LogOut, Settings, ShieldAlert, Users } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({ mode = "workspace" }: { mode?: "workspace" | "admin" }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const navItems = mode === "admin"
    ? [
        { label: t("nav.admin"), to: "/admin", icon: Users, end: true },
        { label: t("nav.backToWorkspace"), to: "/app", icon: ArrowLeftRight, end: false },
      ]
    : [
        { label: t("nav.domains"), to: "/app", icon: ShieldAlert, end: true },
        { label: t("nav.notifications"), to: "/app/notifications", icon: Bell, end: false },
        { label: t("nav.settings"), to: "/app/settings", icon: Settings, end: false },
      ];

  const shellTitle = mode === "admin" ? t("shell.adminTitle") : t("shell.title");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur">
        <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Certwarden</p>
            <h1 className="text-xl font-semibold tracking-[0.01em]">{shellTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {mode === "workspace" && user?.role === "super_admin" ? (
              <NavLink
                className="inline-flex h-11 items-center justify-center border border-border bg-background px-4 text-sm font-semibold tracking-[0.06em] text-foreground transition hover:bg-secondary"
                to="/admin"
              >
                {t("nav.admin")}
              </NavLink>
            ) : null}
            <div className="border border-border bg-background px-3 py-2 text-right text-sm">
              <p className="font-medium tracking-[0.01em]">{user?.username}</p>
              <p className="text-muted-foreground">{user?.email || t("settings.noEmailBound")}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {user?.role ? t(user.role === "super_admin" ? "role.super_admin" : "role.tenant_owner") : null}
              </p>
            </div>
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="page-shell grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-1 border border-border bg-card p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 border border-transparent px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground",
                    isActive && "border-border bg-secondary text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </aside>

        <main className="space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
