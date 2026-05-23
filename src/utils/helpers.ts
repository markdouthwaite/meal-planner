import type { Unit, WeekDay } from '../types';

export const WEEK_DAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const WEEK_DAY_SHORT_LABELS: Record<WeekDay, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Returns the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function addWeeks(weekStart: string, n: number): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

export function isCurrentWeek(weekStart: string): boolean {
  const current = getWeekStart(new Date()).toISOString().split('T')[0];
  return weekStart === current;
}

// ---------------------------------------------------------------------------
// Date helpers (ISO YYYY-MM-DD strings, treated as local-tz dates)
// ---------------------------------------------------------------------------

/** Today as an ISO YYYY-MM-DD string (local time). */
export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/** Add `n` days to an ISO YYYY-MM-DD date, returning a new ISO string. */
export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Difference in days between two ISO dates (b - a). */
export function daysBetweenISO(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86_400_000);
}

/** "Mon", "Tue", … for an ISO date. */
export function formatDayShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

/** "Monday", "Tuesday", … for an ISO date. */
export function formatDayLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

/** "24 May" — short numeric date. */
export function formatDateMedium(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** A friendly two-line "Mon" / "24" label for the day-stripe on slot cards. */
export function formatDayStripe(iso: string): { weekday: string; day: number } {
  const d = new Date(iso + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    day: d.getDate(),
  };
}

/** "24–30 May" or "30 May – 5 Jun" if the range straddles a month. */
export function formatDateRange(start: string, end: string): string {
  const ds = new Date(start + 'T00:00:00');
  const de = new Date(end + 'T00:00:00');
  const sameMonth = ds.getMonth() === de.getMonth() && ds.getFullYear() === de.getFullYear();
  const startStr = sameMonth
    ? String(ds.getDate())
    : ds.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr = de.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${startStr} – ${endStr}`;
}

export const UNITS: Unit[] = [
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cups', 'pieces', 'bunch', 'tin', 'pack',
];

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  baby: 'Baby',
};

export const MEAL_TYPE_COLOURS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800',
  lunch:     'bg-sky-100 text-sky-800',
  dinner:    'bg-indigo-100 text-indigo-800',
  snack:     'bg-orange-100 text-orange-800',
  baby:      'bg-pink-100 text-pink-800',
};

export function formatQuantity(qty: number): string {
  if (qty === Math.floor(qty)) return String(qty);
  return qty.toFixed(1).replace(/\.0$/, '');
}
