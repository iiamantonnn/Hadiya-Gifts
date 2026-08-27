import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import AIAssistant from "../components/ai/AIAssistant";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { greetingForHour, armeniaHourNow } from "../lib/format";
import type { Person, UpcomingEvent } from "../lib/types";

const QUICK_ACTIONS = [
  { id: "sendFlowers", labelKey: "dashboard.quickActions.sendFlowers", to: "/search", icon: "✿" },
  { id: "addPerson", labelKey: "dashboard.quickActions.addPerson", to: "/people", icon: "＋" },
  { id: "createWishlist", labelKey: "dashboard.quickActions.createWishlist", to: "/wishlist", icon: "☆" },
  { id: "viewGifts", labelKey: "dashboard.quickActions.viewGifts", to: "/gift-history", icon: "✉" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [favorites, setFavorites] = useState<Person[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.post("/notifications/sync").catch(() => {});
    api.get<UpcomingEvent[]>("/people/upcoming-events").then(setEvents).catch(() => {});
    api.get<Person[]>("/people").then((people) => setFavorites(people.filter((p) => p.is_favorite))).catch(() => {});
  }, []);

  const name = user?.preferred_name || user?.first_name || "";
  const period = greetingForHour(armeniaHourNow());
  const greeting = t(`dashboard.good${period.charAt(0).toUpperCase()}${period.slice(1)}`, { name });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{greeting}</h1>
        <p className="mt-1 text-ink-muted">{t("dashboard.subtitle")}</p>
      </div>

      <AIAssistant />

      <form
        onSubmit={(e) => { e.preventDefault(); window.location.href = `/search?q=${encodeURIComponent(query)}`; }}
        className="flex"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-sm focus:border-forest focus:outline-none"
        />
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.id} to={action.to}>
            <Card className="flex flex-col items-center gap-2 py-6 text-center transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-ink">{t(action.labelKey)}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">{t("dashboard.upcoming")}</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">{t("dashboard.noUpcomingEvents")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {events.slice(0, 6).map((event, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {t("dashboard.personEvent", { name: event.person_name, label: event.label.toLowerCase() })}
                  </span>
                  <span className="font-medium text-rose-dark">
                    {event.days_until === 0 ? t("dashboard.today") : t("dashboard.daysUntil", { days: event.days_until })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{t("dashboard.favoritePeople")}</h2>
            <Link to="/people" className="text-sm font-medium text-forest">{t("dashboard.seeAll")}</Link>
          </div>
          {favorites.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">{t("dashboard.noFavorites")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {favorites.slice(0, 5).map((person) => (
                <li key={person.id}>
                  <Link to={`/people/${person.id}`} className="text-sm font-medium text-ink hover:text-forest">
                    {person.name} <span className="text-ink-faint">- {person.relationship_type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Button href="/search" variant="secondary" className="self-start">{t("dashboard.browseFullCatalog")}</Button>
    </div>
  );
}
