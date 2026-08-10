// Current-week helpers (Mon-Sun). Athletes can only edit entries within this week.
export function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfWeek(d = new Date()): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
export function isoDate(d: Date): string {
  // Local date (never UTC) so the strip labels match the real weekday.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function isCurrentWeek(iso: string): boolean {
  const s = startOfWeek();
  const e = endOfWeek();
  return iso >= isoDate(s) && iso <= isoDate(e);
}
export function weekDays(d = new Date()): string[] {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(s); x.setDate(s.getDate() + i);
    return isoDate(x);
  });
}
export const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
