export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function greetingForHour(hour: number): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
