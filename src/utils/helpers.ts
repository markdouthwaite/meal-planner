import type { Unit } from '../types';

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
