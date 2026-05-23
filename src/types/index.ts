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
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * What's happening in this meal slot:
 * - `cook`      — cooking the recipe today; ingredients go on the shopping list.
 * - `leftovers` — re-eating a recipe cooked on another day (`leftovers_of`);
 *                 contributes nothing extra to the shopping list.
 * - `out`       — eating out / takeaway; no recipe, no shopping.
 * - `skip`      — intentionally skipping this meal (lets the user mark the
 *                 slot as "handled" without picking).
 */
export type SlotMode = 'cook' | 'leftovers' | 'out' | 'skip';

export interface PlanSlot {
  day: WeekDay;
  meal: 'dinner'; // Phase 1: dinner only. Lunch slots later.
  mode: SlotMode;
  recipe_id?: string;
  /** Multiplier for the recipe's default servings, e.g. 2 to cook double. */
  servings_override: number | null;
  /** For `mode: 'leftovers'`, the day whose cook-slot this re-uses. */
  leftovers_of?: WeekDay;
  /** Optional free-text note ("back late, low effort", etc.) */
  notes?: string;
}

export interface MealPlan {
  id: string;
  week_start: string; // ISO date string: Monday of the week
  slots: PlanSlot[];  // max one per (day, meal)
  status: 'planning' | 'active' | 'archived';
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit | string;
  isManual: boolean;
  checked: boolean;
  removed: boolean;
}
