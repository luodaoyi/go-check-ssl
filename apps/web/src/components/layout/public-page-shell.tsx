import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center">
      <div className="absolute right-4 top-6 sm:right-6 lg:right-8">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}
