import { Link } from "react-router-dom";
import type { Flower } from "../../lib/types";
import { formatPrice } from "../../lib/format";

export default function FlowerCard({ flower }: { flower: Flower }) {
  return (
    <Link
      to={`/flowers/${flower.id}`}
      className="group block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="aspect-square bg-forest-soft">
        {flower.images[0] && (
          <img src={flower.images[0]} alt={flower.name} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="font-medium text-ink group-hover:text-forest">{flower.name}</p>
        <p className="text-xs uppercase tracking-wide text-ink-faint">{flower.flower_type}</p>
        <p className="mt-1 font-display text-lg text-forest">{formatPrice(flower.price_cents)}</p>
      </div>
    </Link>
  );
}
