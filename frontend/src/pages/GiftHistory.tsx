import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { GiftHistoryEntry } from "../lib/types";

function Row({ entry, direction }: { entry: GiftHistoryEntry; direction: "sent" | "received" }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-forest-soft">
        {entry.flower.images[0] && <img src={entry.flower.images[0]} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-ink">{entry.flower.name}</p>
        <p className="text-sm text-ink-muted">
          {direction === "sent" ? `To ${entry.recipient_name}` : entry.sender_name ? `From ${entry.sender_name}` : "From a secret admirer"}
          {entry.occasion && ` - ${entry.occasion.replace("_", " ")}`}
        </p>
        <p className="text-xs text-ink-faint">{new Date(entry.delivery_date).toLocaleDateString()} - {entry.status.replace(/_/g, " ")}</p>
      </div>
      <p className="font-display text-forest">{formatPrice(entry.price_cents)}</p>
    </Card>
  );
}

export default function GiftHistory() {
  const [sent, setSent] = useState<GiftHistoryEntry[]>([]);
  const [received, setReceived] = useState<GiftHistoryEntry[]>([]);
  const [tab, setTab] = useState<"sent" | "received">("sent");

  useEffect(() => {
    api.get<{ sent: GiftHistoryEntry[]; received: GiftHistoryEntry[] }>("/orders").then((data) => {
      setSent(data.sent);
      setReceived(data.received);
    }).catch(() => {});
  }, []);

  const list = tab === "sent" ? sent : received;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Gift History</h1>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("sent")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "sent" ? "bg-forest text-white" : "bg-surface text-ink-muted"}`}>Sent</button>
        <button onClick={() => setTab("received")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "received" ? "bg-forest text-white" : "bg-surface text-ink-muted"}`}>Received</button>
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">Nothing here yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {list.map((entry) => <Row key={entry.id} entry={entry} direction={tab} />)}
        </div>
      )}
    </div>
  );
}
