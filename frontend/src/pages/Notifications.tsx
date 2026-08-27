import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { api } from "../lib/api";
import type { Notification } from "../lib/types";

export default function Notifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);

  function load() {
    api.get<Notification[]>("/notifications").then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function markAllRead() {
    await api.post("/notifications/read-all");
    load();
  }

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`);
    load();
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">{t("notifications.title")}</h1>
        {items.some((n) => !n.read) && <Button variant="ghost" size="sm" onClick={markAllRead}>{t("notifications.markAllRead")}</Button>}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">{t("notifications.emptyState")}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{n.title}</p>
                  <p className="text-xs text-ink-faint">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="shrink-0 text-xs text-forest">{t("notifications.markRead")}</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
