import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { Flower } from "../lib/types";
import { translateOptionValue } from "../lib/flowerOptionLabels";

export default function FlowerDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<Flower>(`/flowers/${id}`).then(setFlower).catch(() => setError(t("flowers.itemUnavailable")));
  }, [id, t]);

  if (error) return <p className="text-center text-ink-muted">{error}</p>;
  if (!flower) return <p className="text-center text-ink-faint">{t("common.loading")}</p>;

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-[var(--radius-card)] bg-forest-soft">
        {flower.images[0] && <img src={flower.images[0]} alt={flower.name} className="h-full w-full object-cover" />}
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{flower.name}</h1>
        <p className="mt-2 font-display text-2xl text-forest">{formatPrice(flower.price_cents)}</p>
        <p className="mt-4 text-ink-muted">{flower.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {flower.sizes.map((s) => (
            <span key={s} className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted">{translateOptionValue(t, "sizes", s)}</span>
          ))}
          {flower.colors.map((c) => (
            <span key={c} className="rounded-full bg-rose-soft px-3 py-1 text-xs text-rose-dark">{translateOptionValue(t, "colors", c)}</span>
          ))}
        </div>

        <Button className="mt-6 w-full sm:w-auto" size="lg" onClick={() => navigate(`/checkout?flower_id=${flower.id}`)}>
          {t("flowers.addToGift")}
        </Button>

        <Card className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink">{t("flowers.care.title")}</h2>
          <p className="mt-2 text-sm font-medium text-forest">{flower.estimated_lifespan_text}</p>
          <dl className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
            <div><dt className="inline font-medium text-ink">{t("flowers.care.water")}</dt><dd className="inline">{flower.water_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">{t("flowers.care.stems")}</dt><dd className="inline">{flower.stem_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">{t("flowers.care.placement")}</dt><dd className="inline">{flower.placement_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">{t("flowers.care.avoid")}</dt><dd className="inline">{flower.avoid_notes}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
