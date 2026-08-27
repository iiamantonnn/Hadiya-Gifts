import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth-context";
import Logo from "../ui/Logo";
import LanguageSwitcher from "../ui/LanguageSwitcher";

const NAV_ITEMS = [
  { to: "/dashboard", key: "home", icon: "⌂" },
  { to: "/search", key: "search", icon: "⌕" },
  { to: "/people", key: "people", icon: "♥" },
  { to: "/wishlist", key: "wishlist", icon: "☆" },
  { to: "/gift-history", key: "history", icon: "✉" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-ivory pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/dashboard">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-forest-soft text-forest" : "text-ink-muted hover:text-ink"
                  }`
                }
              >
                {t(`common.nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NavLink to="/notifications" className="text-ink-muted hover:text-ink" aria-label={t("common.nav.notifications")}>
              &#9993;
            </NavLink>
            <NavLink to="/settings" className="text-sm font-medium text-ink hover:text-forest">
              {user?.preferred_name || user?.first_name}
            </NavLink>
            <button onClick={() => logout()} className="text-sm text-ink-faint hover:text-ink">
              {t("common.nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface sm:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${isActive ? "text-forest" : "text-ink-faint"}`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {t(`common.nav.${item.key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
