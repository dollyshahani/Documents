// All date math happens on YYYY-MM-DD strings in the user's timezone.

export function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function displayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}

// Week of the month frame: days 1-7 => 1, 8-14 => 2, 15-21 => 3, 22+ => 4.
export function weekNumberFor(dateStr: string): number {
  const day = Number(dateStr.slice(8, 10));
  return Math.min(4, Math.ceil(day / 7));
}

export function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00Z").getUTCDay() === 0;
}
