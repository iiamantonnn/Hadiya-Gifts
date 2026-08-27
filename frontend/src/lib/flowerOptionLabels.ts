// Shared helper for turning a raw backend enum value (flower type, color,
// size, occasion, relationship - e.g. "just_because") into a natural,
// translated UI label. Used by Search.tsx (filter dropdowns), FlowerCard.tsx
// (type badge) and FlowerDetail.tsx (size/color chips).

// Humanizes a raw value as a last-resort fallback so nothing ever renders
// blank when a translation is missing for a given value.
export function label(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// category is one of the search.values.* buckets: "flowerTypes" | "colors" |
// "sizes" | "occasions" | "relationships".
export function translateOptionValue(t: (key: string) => string, category: string, value: string): string {
  const camel = value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const key = `search.values.${category}.${camel}`;
  const translated = t(key);
  return translated === key ? label(value) : translated;
}
