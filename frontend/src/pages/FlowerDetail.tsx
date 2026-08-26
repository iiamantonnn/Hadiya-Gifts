import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { Flower } from "../lib/types";

function label(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function FlowerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<Flower>(`/flowers/${id}`).then(setFlower).catch(() => setError("This item is no longer available."));
  }, [id]);

  if (error) return <p className="text-center text-ink-muted">{error}</p>;
  if (!flower) return <p className="text-center text-ink-faint">Loading...</p>;

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
            <span key={s} className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted">{label(s)}</span>
          ))}
          {flower.colors.map((c) => (
            <span key={c} className="rounded-full bg-rose-soft px-3 py-1 text-xs text-rose-dark">{label(c)}</span>
          ))}
        </div>

        <Button className="mt-6 w-full sm:w-auto" size="lg" onClick={() => navigate(`/checkout?flower_id=${flower.id}`)}>
          Add to Gift
        </Button>

        <Card className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink">Flower care</h2>
          <p className="mt-2 text-sm font-medium text-forest">{flower.estimated_lifespan_text}</p>
          <dl className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
            <div><dt className="inline font-medium text-ink">Water: </dt><dd className="inline">{flower.water_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Stems: </dt><dd className="inline">{flower.stem_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Placement: </dt><dd className="inline">{flower.placement_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Avoid: </dt><dd className="inline">{flower.avoid_notes}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
