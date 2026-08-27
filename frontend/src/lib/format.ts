export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function greetingForHour(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// Returns the current hour (0-23) in Armenia time (Asia/Yerevan), regardless
// of the browser/device's local timezone - used for the dashboard greeting
// so it stays correct during demos even if the presenter's machine is set
// to a different timezone.
export function armeniaHourNow(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Yerevan",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    const hour = hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
    return ((hour % 24) + 24) % 24; // normalize any 24->0 edge case
  } catch {
    return new Date().getHours(); // Intl/timezone data unavailable - degrade gracefully
  }
}
