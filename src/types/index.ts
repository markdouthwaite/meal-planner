export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'baby';

export type Unit =
  | 'g' | 'kg' | 'ml' | 'l'
  | 'tsp' | 'tbsp' | 'cups'
  | 'pieces' | 'bunch' | 'tin' | 'pack';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: string;
  ingredients: Ingredient[];
  steps: string[];
  meal_type: MealType[];
  servings: number;
  notes: string;
  source_url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  /**
   * Owning household. `null`/undefined means a global *base* recipe (seeded,
   * visible to everyone, read-only). A value means a user-created recipe owned
   * by that household — only the owner can edit or delete it.
   */
  household_id?: string | null;
  /** When true, an owned recipe is visible to all households (read-only to others). */
  is_shared?: boolean;
}

/**
 * What's happening in this meal slot:
 * - `cook`      — cooking the recipe today; ingredients go on the shopping list.
 * - `leftovers` — re-eating a recipe cooked on another day (`leftovers_of`);
 *                 contributes nothing extra to the shopping list.
 * - `skip`      — no cooking today (eating out, fasting, fending for
 *                 ourselves, etc.). Marks the slot as handled without
 *                 picking a recipe.
 */
export type SlotMode = 'cook' | 'leftovers' | 'skip';

export interface PlanSlot {
  /** ISO date (YYYY-MM-DD) the slot belongs to. */
  date: string;
  meal: 'dinner'; // Phase 1: dinner only. Lunch slots later.
  mode: SlotMode;
  recipe_id?: string;
  /** Multiplier for the recipe's default servings, e.g. 2 to cook double. */
  servings_override: number | null;
  /** For `mode: 'leftovers'`, the ISO date of the cook-slot this re-uses. */
  leftovers_of?: string;
  /** Optional free-text note ("back late, low effort", etc.) */
  notes?: string;
}

export interface MealPlan {
  id: string;
  slots: PlanSlot[]; // max one per (date, meal)
  status: 'planning' | 'active' | 'archived';
}

/** Day-of-week helper type (used purely for short label display). */
export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit | string;
  isManual: boolean;
  checked: boolean;
  removed: boolean;
}
