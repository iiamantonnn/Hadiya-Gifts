import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import AIAssistant from "../components/ai/AIAssistant";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { greetingForHour } from "../lib/format";
import type { Person, UpcomingEvent } from "../lib/types";

const QUICK_ACTIONS = [
  { label: "Send Flowers", to: "/search", icon: "✿" },
  { label: "Add Person", to: "/people", icon: "＋" },
  { label: "Create Wishlist", to: "/wishlist", icon: "☆" },
  { label: "View Gifts", to: "/gift-history", icon: "✉" },
];

export default function Dashboard() {
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
  const greeting = `${greetingForHour(new Date().getHours())}, ${name}.`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{greeting}</h1>
        <p className="mt-1 text-ink-muted">What would you like to do today?</p>
      </div>

      <AIAssistant />

      <form
        onSubmit={(e) => { e.preventDefault(); window.location.href = `/search?q=${encodeURIComponent(query)}`; }}
        className="flex"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flowers, occasions, colors..."
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-sm focus:border-forest focus:outline-none"
        />
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.label} to={action.to}>
            <Card className="flex flex-col items-center gap-2 py-6 text-center transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-ink">{action.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Upcoming</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">No important dates coming up in the next two months.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {events.slice(0, 6).map((event, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{event.person_name}'s {event.label.toLowerCase()}</span>
                  <span className="font-medium text-rose-dark">
                    {event.days_until === 0 ? "today" : `${event.days_until}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Favorite people</h2>
            <Link to="/people" className="text-sm font-medium text-forest">See all</Link>
          </div>
          {favorites.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">Mark someone as a favorite to see them here.</p>
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

      <Button href="/search" variant="secondary" className="self-start">Browse the full catalog</Button>
    </div>
  );
}
