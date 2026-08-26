import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FlowerCard from "../components/flowers/FlowerCard";
import { Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Sheet from "../components/ui/Sheet";
import { api } from "../lib/api";
import type { Flower } from "../lib/types";

interface FilterOptions {
  flower_types: string[];
  colors: string[];
  sizes: string[];
  occasions: string[];
  relationships: string[];
}

const EMPTY_FILTERS = { flower_type: "", color: "", occasion: "", relationship: "", size: "", min_price: "", max_price: "" };

function label(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function Search() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [results, setResults] = useState<Flower[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<FilterOptions>("/flowers/options").then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      const query = new URLSearchParams();
      if (q) query.set("q", q);
      Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
      api.get<Flower[]>(`/flowers?${query.toString()}`).then(setResults).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [q, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const applyFilters = () => {
    setFilters(draftFilters);
    setSheetOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const filterFields = options && (
    <div className="flex flex-col gap-4">
      <Select label="Flower type" value={draftFilters.flower_type} onChange={(e) => setDraftFilters({ ...draftFilters, flower_type: e.target.value })}>
        <option value="">Any</option>
        {options.flower_types.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </Select>
      <Select label="Color" value={draftFilters.color} onChange={(e) => setDraftFilters({ ...draftFilters, color: e.target.value })}>
        <option value="">Any</option>
        {options.colors.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </Select>
      <Select label="Size" value={draftFilters.size} onChange={(e) => setDraftFilters({ ...draftFilters, size: e.target.value })}>
        <option value="">Any</option>
        {options.sizes.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </Select>
      <Select label="Occasion" value={draftFilters.occasion} onChange={(e) => setDraftFilters({ ...draftFilters, occasion: e.target.value })}>
        <option value="">Any</option>
        {options.occasions.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </Select>
      <Select label="Relationship" value={draftFilters.relationship} onChange={(e) => setDraftFilters({ ...draftFilters, relationship: e.target.value })}>
        <option value="">Any</option>
        {options.relationships.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-muted">
          Min price ($)
          <input type="number" min="0" className="rounded-[var(--radius-control)] border border-border px-3 py-2" value={draftFilters.min_price}
            onChange={(e) => setDraftFilters({ ...draftFilters, min_price: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-muted">
          Max price ($)
          <input type="number" min="0" className="rounded-[var(--radius-control)] border border-border px-3 py-2" value={draftFilters.max_price}
            onChange={(e) => setDraftFilters({ ...draftFilters, max_price: e.target.value })} />
        </label>
      </div>
      <Button size="lg" className="w-full" onClick={applyFilters}>Apply filters</Button>
      <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      <aside className="hidden w-64 shrink-0 sm:block">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Filters</h2>
        {filterFields}
      </aside>

      <div className="flex-1">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search flowers, occasions, colors..."
            className="flex-1 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-sm focus:border-forest focus:outline-none"
          />
          <Button variant="ghost" className="sm:hidden" onClick={() => setSheetOpen(true)}>
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-ink-faint">Searching...</p>
        ) : results.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-faint">No matches. Try adjusting your filters.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {results.map((f) => <FlowerCard key={f.id} flower={f} />)}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        {filterFields}
      </Sheet>
    </div>
  );
}
