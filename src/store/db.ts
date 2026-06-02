import { supabase } from '../lib/supabase';
import type {
  Ingredient,
  MealPlan,
  MealType,
  PlanSlot,
  Recipe,
  ShoppingItem,
  SlotMode,
} from '../types';
import { SEED_RECIPES } from '../utils/seedData';

/**
 * Supabase data-access layer for the meal planner.
 *
 * The React app keeps its existing reducer + `useAppState`/`useAppDispatch`
 * API; this module is what the store calls to (a) load a household's data on
 * sign-in and (b) persist each mutating action. All access is automatically
 * scoped to the signed-in user's household by Row Level Security — we never
 * pass credentials here.
 */

const DEFAULT_HOUSEHOLD_NAME = 'Our Household';

// ---------------------------------------------------------------------------
// Row shapes (what Supabase returns) + mappers to/from app types
// ---------------------------------------------------------------------------
interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  ingredients: Ingredient[] | null;
  steps: string[] | null;
  meal_type: string[] | null;
  servings: number | null;
  notes: string | null;
  source_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface SlotRow {
  date: string;
  meal: string;
  mode: SlotMode;
  recipe_id: string | null;
  servings_override: number | null;
  leftovers_of: string | null;
  notes: string | null;
}

interface ShoppingItemRow {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  is_manual: boolean;
  checked: boolean;
  removed: boolean;
}

function rowToRecipe(r: RecipeRow): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    image: r.image ?? undefined,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    meal_type: (r.meal_type ?? []) as MealType[],
    servings: r.servings ?? 1,
    notes: r.notes ?? '',
    source_url: r.source_url ?? '',
    tags: r.tags ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function recipeToRow(r: Recipe, householdId: string) {
  return {
    id: r.id,
    household_id: householdId,
    title: r.title,
    description: r.description,
    image: r.image ?? null,
    ingredients: r.ingredients,
    steps: r.steps,
    meal_type: r.meal_type,
    servings: r.servings,
    notes: r.notes,
    source_url: r.source_url,
    tags: r.tags,
  };
}

function rowToSlot(s: SlotRow): PlanSlot {
  return {
    date: s.date,
    meal: s.meal as PlanSlot['meal'],
    mode: s.mode,
    recipe_id: s.recipe_id ?? undefined,
    servings_override: s.servings_override ?? null,
    leftovers_of: s.leftovers_of ?? undefined,
    notes: s.notes ?? undefined,
  };
}

function slotToRow(s: PlanSlot, planId: string) {
  return {
    plan_id: planId,
    date: s.date,
    meal: s.meal,
    mode: s.mode,
    recipe_id: s.recipe_id ?? null,
    servings_override: s.servings_override ?? null,
    leftovers_of: s.leftovers_of ?? null,
    notes: s.notes ?? null,
  };
}

function rowToShoppingItem(i: ShoppingItemRow): ShoppingItem {
  return {
    id: i.id,
    name: i.name,
    quantity: Number(i.quantity),
    unit: i.unit,
    isManual: i.is_manual,
    checked: i.checked,
    removed: i.removed,
  };
}

function shoppingItemToRow(i: ShoppingItem, householdId: string) {
  return {
    id: i.id,
    household_id: householdId,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    is_manual: i.isManual,
    checked: i.checked,
    removed: i.removed,
  };
}

// ---------------------------------------------------------------------------
// Bootstrap + initial load
// ---------------------------------------------------------------------------
export interface LoadedData {
  householdId: string;
  planId: string;
  recipes: Recipe[];
  plan: MealPlan;
  shoppingItems: ShoppingItem[];
  removedRecipeItems: string[];
  recipeItemQuantityOverrides: Record<string, number>;
}

/** Find the signed-in user's household, creating (and seeding) one if needed. */
async function getOrCreateHousehold(): Promise<{ id: string; isNew: boolean }> {
  const { data: memberships, error } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1);
  if (error) throw error;
  if (memberships && memberships.length > 0) {
    return { id: memberships[0].household_id as string, isNew: false };
  }

  // No household yet — create one. The DB trigger adds the creator as owner.
  const { data: created, error: insErr } = await supabase
    .from('households')
    .insert({ name: DEFAULT_HOUSEHOLD_NAME })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return { id: created.id as string, isNew: true };
}

/** Seed starter recipes into a brand-new household (once). */
async function seedHousehold(householdId: string): Promise<void> {
  const rows = SEED_RECIPES.map(r => recipeToRow(r, householdId));
  const { error } = await supabase.from('recipes').insert(rows);
  if (error) throw error;
}

/** Get the household's active plan, creating one if none exists. */
async function getOrCreatePlan(householdId: string): Promise<string> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('household_id', householdId)
    .in('status', ['planning', 'active'])
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  if (data && data.length > 0) return data[0].id as string;

  const { data: created, error: insErr } = await supabase
    .from('meal_plans')
    .insert({ household_id: householdId, status: 'planning' })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id as string;
}

/** Load everything the app needs for the signed-in user's household. */
export async function loadAppData(): Promise<LoadedData> {
  const household = await getOrCreateHousehold();
  if (household.isNew) {
    await seedHousehold(household.id);
  }
  const planId = await getOrCreatePlan(household.id);

  const [recipesRes, slotsRes, shoppingRes, removedRes, overridesRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('household_id', household.id),
    supabase.from('plan_slots').select('*').eq('plan_id', planId),
    supabase.from('shopping_items').select('*').eq('household_id', household.id),
    supabase.from('removed_recipe_items').select('item_key').eq('household_id', household.id),
    supabase
      .from('recipe_item_overrides')
      .select('item_key, quantity')
      .eq('household_id', household.id),
  ]);

  for (const res of [recipesRes, slotsRes, shoppingRes, removedRes, overridesRes]) {
    if (res.error) throw res.error;
  }

  const overrides: Record<string, number> = {};
  for (const row of (overridesRes.data ?? []) as { item_key: string; quantity: number | string }[]) {
    overrides[row.item_key] = Number(row.quantity);
  }

  return {
    householdId: household.id,
    planId,
    recipes: ((recipesRes.data ?? []) as RecipeRow[]).map(rowToRecipe),
    plan: {
      id: planId,
      slots: ((slotsRes.data ?? []) as SlotRow[]).map(rowToSlot),
      status: 'planning',
    },
    shoppingItems: ((shoppingRes.data ?? []) as ShoppingItemRow[]).map(rowToShoppingItem),
    removedRecipeItems: ((removedRes.data ?? []) as { item_key: string }[]).map(r => r.item_key),
    recipeItemQuantityOverrides: overrides,
  };
}

// ---------------------------------------------------------------------------
// Mutations — one helper per kind of write the reducer performs
// ---------------------------------------------------------------------------
function check(error: { message: string } | null): void {
  if (error) throw error;
}

export const db = {
  async insertRecipe(recipe: Recipe, householdId: string): Promise<void> {
    const { error } = await supabase.from('recipes').insert(recipeToRow(recipe, householdId));
    check(error);
  },

  async updateRecipe(recipe: Recipe, householdId: string): Promise<void> {
    const { error } = await supabase
      .from('recipes')
      .update(recipeToRow(recipe, householdId))
      .eq('id', recipe.id);
    check(error);
  },

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    check(error);
  },

  async upsertSlot(slot: PlanSlot, planId: string): Promise<void> {
    const { error } = await supabase
      .from('plan_slots')
      .upsert(slotToRow(slot, planId), { onConflict: 'plan_id,date,meal' });
    check(error);
  },

  async deleteSlot(planId: string, date: string, meal: string): Promise<void> {
    const { error } = await supabase
      .from('plan_slots')
      .delete()
      .eq('plan_id', planId)
      .eq('date', date)
      .eq('meal', meal);
    check(error);
  },

  async clearSlots(planId: string): Promise<void> {
    const { error } = await supabase.from('plan_slots').delete().eq('plan_id', planId);
    check(error);
  },

  /** Replace all of a plan's slots — used when a delete cascades into slots. */
  async replaceSlots(planId: string, slots: PlanSlot[]): Promise<void> {
    const { error: delErr } = await supabase.from('plan_slots').delete().eq('plan_id', planId);
    check(delErr);
    if (slots.length > 0) {
      const { error: insErr } = await supabase
        .from('plan_slots')
        .insert(slots.map(s => slotToRow(s, planId)));
      check(insErr);
    }
  },

  async insertShoppingItem(item: ShoppingItem, householdId: string): Promise<void> {
    const { error } = await supabase
      .from('shopping_items')
      .insert(shoppingItemToRow(item, householdId));
    check(error);
  },

  async updateShoppingItem(
    id: string,
    patch: Partial<{ checked: boolean; quantity: number; removed: boolean }>,
  ): Promise<void> {
    const { error } = await supabase.from('shopping_items').update(patch).eq('id', id);
    check(error);
  },

  async deleteShoppingItem(id: string): Promise<void> {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id);
    check(error);
  },

  async clearShoppingItems(householdId: string): Promise<void> {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('household_id', householdId);
    check(error);
  },

  async setRemovedItem(householdId: string, key: string, present: boolean): Promise<void> {
    if (present) {
      const { error } = await supabase
        .from('removed_recipe_items')
        .upsert({ household_id: householdId, item_key: key });
      check(error);
    } else {
      const { error } = await supabase
        .from('removed_recipe_items')
        .delete()
        .eq('household_id', householdId)
        .eq('item_key', key);
      check(error);
    }
  },

  async replaceRemovedItems(householdId: string, keys: string[]): Promise<void> {
    const { error: delErr } = await supabase
      .from('removed_recipe_items')
      .delete()
      .eq('household_id', householdId);
    check(delErr);
    if (keys.length > 0) {
      const { error: insErr } = await supabase
        .from('removed_recipe_items')
        .insert(keys.map(item_key => ({ household_id: householdId, item_key })));
      check(insErr);
    }
  },

  async setOverride(householdId: string, key: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('recipe_item_overrides')
      .upsert({ household_id: householdId, item_key: key, quantity });
    check(error);
  },

  async deleteOverride(householdId: string, key: string): Promise<void> {
    const { error } = await supabase
      .from('recipe_item_overrides')
      .delete()
      .eq('household_id', householdId)
      .eq('item_key', key);
    check(error);
  },

  async clearOverrides(householdId: string): Promise<void> {
    const { error } = await supabase
      .from('recipe_item_overrides')
      .delete()
      .eq('household_id', householdId);
    check(error);
  },
};
