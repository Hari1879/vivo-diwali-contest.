/** Helpers for India Standard Time (UTC+05:30) date boundaries. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "2026-10-27" -> Date at 00:00 IST on that day. */
export function istStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

/** "2026-10-27" -> Date at 00:00 IST on the next day (exclusive upper bound). */
export function istEndOfDayExclusive(dateStr: string): Date {
  return new Date(istStartOfDay(dateStr).getTime() + 24 * 60 * 60 * 1000);
}

export function istToday(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatIst(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19);
}
