import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Sheet from "../components/ui/Sheet";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { GiftHistoryEntry, OrderDetail } from "../lib/types";

function Row({ entry, direction, onOpen }: { entry: GiftHistoryEntry; direction: "sent" | "received"; onOpen: () => void }) {
  const { t } = useTranslation();
  const fromToText =
    direction === "sent"
      ? t("history.to", { name: entry.recipient_name })
      : entry.sender_name
        ? t("history.from", { name: entry.sender_name })
        : t("history.secretAdmirer");
  const occasionText = entry.occasion
    ? t(`history.occasions.${entry.occasion}`, { defaultValue: entry.occasion.replace(/_/g, " ") })
    : null;
  const statusText = t(`history.statuses.${entry.status}`, { defaultValue: entry.status.replace(/_/g, " ") });

  return (
    <button type="button" onClick={onOpen} className="w-full text-start">
      <Card className="flex items-center gap-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-forest-soft">
          {entry.flower.images[0] && <img src={entry.flower.images[0]} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1">
          <p className="font-medium text-ink">{entry.flower.name}</p>
          <p className="text-sm text-ink-muted">
            {fromToText}
            {occasionText && ` - ${occasionText}`}
          </p>
          <p className="text-xs text-ink-faint">{new Date(entry.delivery_date).toLocaleDateString()} - {statusText}</p>
          {entry.wishlist_gift && (
            <p className="text-xs font-medium text-forest">{t("history.additionalGift", { name: entry.wishlist_gift.product_name })}</p>
          )}
        </div>
        <p className="font-display text-forest">{formatPrice(entry.price_cents)}</p>
      </Card>
    </button>
  );
}

function OrderDetailView({ detail }: { detail: OrderDetail }) {
  const { t } = useTranslation();
  const fromToText =
    detail.direction === "sent"
      ? t("history.toColon", { name: detail.recipient_name })
      : detail.sender_name
        ? t("history.fromColon", { name: detail.sender_name })
        : t("history.secretAdmirer");
  const occasionText = detail.occasion
    ? t(`history.occasions.${detail.occasion}`, { defaultValue: detail.occasion.replace(/_/g, " ") })
    : null;
  const statusText = t(`history.statuses.${detail.status}`, { defaultValue: detail.status.replace(/_/g, " ") });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-forest-soft">
          {detail.flower.images[0] && <img src={detail.flower.images[0]} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-ink">{detail.flower.name}</p>
          <p className="text-sm capitalize text-ink-muted">{detail.flower.flower_type}</p>
        </div>
      </div>

      <div className="text-sm text-ink-muted">
        <p>{fromToText}</p>
        {occasionText && <p className="mt-1">{t("history.occasionLabel", { occasion: occasionText })}</p>}
        <p className="mt-1">{new Date(detail.delivery_date).toLocaleDateString()} - {statusText}</p>
      </div>

      {detail.card?.text && (
        <div>
          <p className="text-xs font-medium text-ink-faint">{t("history.cardMessage")}</p>
          <p className="mt-1 text-sm text-ink">{detail.card.text}</p>
        </div>
      )}

      {detail.voice_message_url && (
        <div>
          <p className="text-xs font-medium text-ink-faint">{t("history.voiceMessage")}</p>
          <audio controls src={detail.voice_message_url} className="mt-1 w-full" />
        </div>
      )}

      {detail.wishlist_gift && (
        <div className="flex items-center gap-3">
          {detail.wishlist_gift.image_url && (
            <img src={detail.wishlist_gift.image_url} alt="" className="h-12 w-12 shrink-0 rounded-[var(--radius-control)] object-cover" />
          )}
          <p className="text-sm font-medium text-forest">{t("history.additionalGift", { name: detail.wishlist_gift.product_name })}</p>
        </div>
      )}
    </div>
  );
}

export default function GiftHistory() {
  const { t } = useTranslation();
  const [sent, setSent] = useState<GiftHistoryEntry[]>([]);
  const [received, setReceived] = useState<GiftHistoryEntry[]>([]);
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    api.get<{ sent: GiftHistoryEntry[]; received: GiftHistoryEntry[] }>("/orders").then((data) => {
      setSent(data.sent);
      setReceived(data.received);
    }).catch(() => {});
  }, []);

  function openDetail(id: string) {
    setDetail(null);
    setSheetOpen(true);
    api.get<OrderDetail>(`/orders/${id}`).then(setDetail).catch(() => {});
  }

  const list = tab === "sent" ? sent : received;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">{t("history.title")}</h1>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("sent")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "sent" ? "bg-forest text-white" : "bg-surface text-ink-muted"}`}>{t("history.sent")}</button>
        <button onClick={() => setTab("received")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "received" ? "bg-forest text-white" : "bg-surface text-ink-muted"}`}>{t("history.received")}</button>
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">{t("history.emptyState")}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {list.map((entry) => <Row key={entry.id} entry={entry} direction={tab} onOpen={() => openDetail(entry.id)} />)}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={detail ? detail.flower.name : t("history.giftDetails")}>
        {detail ? <OrderDetailView detail={detail} /> : <p className="text-center text-sm text-ink-faint">{t("common.loading")}</p>}
      </Sheet>
    </div>
  );
}
