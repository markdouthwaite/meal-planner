import type { Recipe, MealPlan, ShoppingItem } from '../types';
import { generateId, formatQuantity } from './helpers';

interface AggregatedItem {
  key: string;
  name: string;
  /** Effective quantity — `originalQuantity` unless an override is set. */
  quantity: number;
  /** Quantity computed from the plan + recipes, before any user override. */
  originalQuantity: number;
  /** True if the user has manually set a quantity for this item. */
  overridden: boolean;
  unit: string;
}

export function aggregateShoppingList(
  plan: MealPlan,
  recipes: Recipe[],
  overrides: Record<string, number> = {},
): AggregatedItem[] {
  const map = new Map<string, { name: string; quantity: number; unit: string }>();

  for (const slot of plan.slots) {
    // Only cook-mode slots add to the shopping list. Leftovers, eat-out and
    // skip contribute nothing — the cook slot's servings_override should be
    // doubled (via "cook double") to cover any leftover days.
    if (slot.mode !== 'cook' || !slot.recipe_id) continue;
    const recipe = recipes.find(r => r.id === slot.recipe_id);
    if (!recipe) continue;

    const scale =
      slot.servings_override != null
        ? slot.servings_override / recipe.servings
        : 1;

    for (const ing of recipe.ingredients) {
      const normName = ing.name.trim().toLowerCase();
      const key = `${normName}||${ing.unit}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += ing.quantity * scale;
      } else {
        map.set(key, {
          name: ing.name.trim(),
          quantity: ing.quantity * scale,
          unit: ing.unit,
        });
      }
    }
  }

  return Array.from(map.entries())
    .map(([key, item]) => {
      const override = overrides[key];
      const overridden = override !== undefined;
      return {
        key,
        name: item.name,
        quantity: overridden ? override : item.quantity,
        originalQuantity: item.quantity,
        overridden,
        unit: item.unit,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function shoppingListToCSV(
  items: AggregatedItem[],
  manualItems: ShoppingItem[]
): string {
  const rows = [
    ['Item', 'Quantity', 'Unit'],
    ...items.map(i => [i.name, formatQuantity(i.quantity), i.unit]),
    ...manualItems.filter(i => !i.removed).map(i => [i.name, formatQuantity(i.quantity), i.unit]),
  ];
  return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}

export function shoppingListToChecklist(
  items: AggregatedItem[],
  manualItems: ShoppingItem[]
): string {
  // Markdown-style bullets (`* Item — qty unit`). Each line becomes a
  // separate item when pasted into Apple Reminders, and the format also
  // renders as a real list in Markdown editors (Notion, Bear, etc.).
  const lines = [
    ...items.map(i => `* ${i.name} — ${formatQuantity(i.quantity)} ${i.unit}`),
    ...manualItems.filter(i => !i.removed).map(i => `* ${i.name} — ${formatQuantity(i.quantity)} ${i.unit}`),
  ];
  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildAppleRemindersURL(items: AggregatedItem[]): string {
  // Use the x-apple-reminderkit URL scheme; falls back to clipboard copy
  const text = items
    .map(i => `${i.name} - ${formatQuantity(i.quantity)} ${i.unit}`)
    .join('\n');
  return `x-apple-reminderkit://reminderslist/?reminderTitle=${encodeURIComponent('Shopping List')}&reminderNotes=${encodeURIComponent(text)}`;
}

export function toShoppingItem(agg: AggregatedItem): ShoppingItem {
  return {
    id: generateId(),
    name: agg.name,
    quantity: agg.quantity,
    unit: agg.unit,
    isManual: false,
    checked: false,
    removed: false,
  };
}
