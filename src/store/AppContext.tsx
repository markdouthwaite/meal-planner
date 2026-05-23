import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Recipe, MealPlan, ShoppingItem, PlanSlot, WeekDay } from '../types';
import { getWeekStart, generateId, WEEK_DAYS } from '../utils/helpers';
import { SEED_RECIPES } from '../utils/seedData';

interface AppState {
  recipes: Recipe[];
  currentPlan: MealPlan;
  shoppingItems: ShoppingItem[];
  removedRecipeItems: Set<string>;
  recipeItemQuantityOverrides: Record<string, number>;
  seenSeedIds: string[];
}

type Action =
  | { type: 'ADD_RECIPE'; recipe: Recipe }
  | { type: 'UPDATE_RECIPE'; recipe: Recipe }
  | { type: 'DELETE_RECIPE'; id: string }
  | { type: 'SET_SLOT'; slot: PlanSlot }
  | { type: 'CLEAR_SLOT'; day: WeekDay; meal: 'dinner' }
  | { type: 'CLEAR_PLAN' }
  | { type: 'ADD_SHOPPING_ITEM'; item: ShoppingItem }
  | { type: 'TOGGLE_SHOPPING_ITEM'; id: string }
  | { type: 'REMOVE_SHOPPING_ITEM'; id: string }
  | { type: 'SET_MANUAL_ITEM_QUANTITY'; id: string; quantity: number }
  | { type: 'TOGGLE_REMOVED_RECIPE_ITEM'; key: string }
  | { type: 'SET_RECIPE_ITEM_QUANTITY'; key: string; quantity: number }
  | { type: 'RESET_RECIPE_ITEM_QUANTITY'; key: string }
  | { type: 'CLEAR_SHOPPING_LIST' }
  | { type: 'LOAD_STATE'; state: AppState };

function getDefaultPlan(): MealPlan {
  return {
    id: generateId(),
    week_start: getWeekStart(new Date()).toISOString().split('T')[0],
    slots: [],
    status: 'planning',
  };
}

/**
 * Convert a pre-slot-model plan (which had `recipes: PlanRecipe[]`) into the
 * new slot-based shape. Distributes one recipe per day starting Monday so the
 * user can re-arrange from there. Any recipes beyond 7 are dropped — they
 * predate the day model and can be re-added manually.
 */
function migratePlan(raw: unknown): MealPlan {
  const plan = raw as Partial<MealPlan> & { recipes?: { recipe_id: string; servings_override: number | null }[] };
  if (Array.isArray(plan.slots)) {
    return plan as MealPlan;
  }
  const oldRecipes = Array.isArray(plan.recipes) ? plan.recipes : [];
  const slots: PlanSlot[] = oldRecipes.slice(0, WEEK_DAYS.length).map((pr, i) => ({
    day: WEEK_DAYS[i],
    meal: 'dinner',
    mode: 'cook',
    recipe_id: pr.recipe_id,
    servings_override: pr.servings_override ?? null,
  }));
  return {
    id: plan.id ?? generateId(),
    week_start: plan.week_start ?? getWeekStart(new Date()).toISOString().split('T')[0],
    slots,
    status: plan.status ?? 'planning',
  };
}

const initialState: AppState = {
  recipes: [],
  currentPlan: getDefaultPlan(),
  shoppingItems: [],
  removedRecipeItems: new Set(),
  recipeItemQuantityOverrides: {},
  seenSeedIds: [],
};

/** Upsert a slot keyed by (day, meal). */
function upsertSlot(slots: PlanSlot[], next: PlanSlot): PlanSlot[] {
  const idx = slots.findIndex(s => s.day === next.day && s.meal === next.meal);
  if (idx === -1) return [...slots, next];
  const copy = slots.slice();
  copy[idx] = next;
  return copy;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_RECIPE':
      return { ...state, recipes: [...state.recipes, action.recipe] };

    case 'UPDATE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.map(r => r.id === action.recipe.id ? action.recipe : r),
      };

    case 'DELETE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.filter(r => r.id !== action.id),
        currentPlan: {
          ...state.currentPlan,
          // Clear the recipe from any slots that referenced it, and turn any
          // leftover slots that pointed at those cook-slots back into empty.
          slots: state.currentPlan.slots
            .filter(s => s.recipe_id !== action.id)
            .map(s => {
              if (s.mode !== 'leftovers') return s;
              const sourceStillExists = state.currentPlan.slots.some(
                src => src.day === s.leftovers_of && src.recipe_id && src.recipe_id !== action.id,
              );
              return sourceStillExists ? s : { ...s, mode: 'cook' as const, recipe_id: undefined, leftovers_of: undefined };
            }),
        },
      };

    case 'SET_SLOT':
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          slots: upsertSlot(state.currentPlan.slots, action.slot),
        },
      };

    case 'CLEAR_SLOT':
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          slots: state.currentPlan.slots.filter(
            s => !(s.day === action.day && s.meal === action.meal),
          ),
        },
      };

    case 'CLEAR_PLAN':
      return {
        ...state,
        currentPlan: { ...state.currentPlan, slots: [] },
      };

    case 'ADD_SHOPPING_ITEM':
      return { ...state, shoppingItems: [...state.shoppingItems, action.item] };

    case 'TOGGLE_SHOPPING_ITEM':
      return {
        ...state,
        shoppingItems: state.shoppingItems.map(i =>
          i.id === action.id ? { ...i, checked: !i.checked } : i
        ),
      };

    case 'REMOVE_SHOPPING_ITEM':
      return {
        ...state,
        shoppingItems: state.shoppingItems.filter(i => i.id !== action.id),
      };

    case 'TOGGLE_REMOVED_RECIPE_ITEM': {
      const next = new Set(state.removedRecipeItems);
      if (next.has(action.key)) {
        next.delete(action.key);
      } else {
        next.add(action.key);
      }
      return { ...state, removedRecipeItems: next };
    }

    case 'SET_MANUAL_ITEM_QUANTITY':
      return {
        ...state,
        shoppingItems: state.shoppingItems.map(i =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };

    case 'SET_RECIPE_ITEM_QUANTITY':
      return {
        ...state,
        recipeItemQuantityOverrides: {
          ...state.recipeItemQuantityOverrides,
          [action.key]: action.quantity,
        },
      };

    case 'RESET_RECIPE_ITEM_QUANTITY': {
      const next = { ...state.recipeItemQuantityOverrides };
      delete next[action.key];
      return { ...state, recipeItemQuantityOverrides: next };
    }

    case 'CLEAR_SHOPPING_LIST':
      return {
        ...state,
        shoppingItems: [],
        removedRecipeItems: new Set(),
        recipeItemQuantityOverrides: {},
      };

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'meal-planner-state';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let loaded: AppState = initialState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.removedRecipeItems = new Set(parsed.removedRecipeItems ?? []);
        parsed.recipeItemQuantityOverrides = parsed.recipeItemQuantityOverrides ?? {};
        parsed.seenSeedIds = parsed.seenSeedIds ?? [];
        parsed.currentPlan = migratePlan(parsed.currentPlan ?? {});
        loaded = parsed;
      }
    } catch {
      // ignore — fall through with initialState
    }

    const seenIds = new Set(loaded.seenSeedIds);
    const existingTitles = new Set(loaded.recipes.map(r => r.title.toLowerCase()));
    const seedsToAdd = SEED_RECIPES.filter(s =>
      !seenIds.has(s.id) && !existingTitles.has(s.title.toLowerCase()),
    );
    const allCurrentSeedIds = SEED_RECIPES.map(s => s.id);
    const needsSeenUpdate = allCurrentSeedIds.some(id => !seenIds.has(id));
    const synced: AppState = (seedsToAdd.length === 0 && !needsSeenUpdate)
      ? loaded
      : {
          ...loaded,
          recipes: [...loaded.recipes, ...seedsToAdd],
          seenSeedIds: Array.from(new Set([...loaded.seenSeedIds, ...allCurrentSeedIds])),
        };

    dispatch({ type: 'LOAD_STATE', state: synced });
  }, []);

  useEffect(() => {
    const serialisable = {
      ...state,
      removedRecipeItems: Array.from(state.removedRecipeItems),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialisable));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx.state;
}

export function useAppDispatch() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx.dispatch;
}
