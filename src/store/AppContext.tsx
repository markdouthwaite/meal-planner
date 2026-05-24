import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Recipe, MealPlan, ShoppingItem, PlanSlot } from '../types';
import { getWeekStart, generateId, toLocalDateString, WEEK_DAYS } from '../utils/helpers';
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
  | { type: 'CLEAR_SLOT'; date: string; meal: 'dinner' }
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
    slots: [],
    status: 'planning',
  };
}

const WD_INDEX: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

/**
 * Bring an arbitrary stored plan up to the current schema. Handles three
 * historical shapes:
 * - Phase 2 (current): { slots: PlanSlot[] } where each slot has `date`.
 * - Phase 1: slots had `day: WeekDay` instead of `date`. We translate the
 *   weekday to a date within the current Monday-Sunday week.
 * - Phase 0: no `slots`, just `recipes: PlanRecipe[]`. We distribute them
 *   one-per-day across this week starting Monday.
 *
 * Old fields (`week_start`) are dropped silently — the new model doesn't
 * anchor to a single week.
 */
function migratePlan(raw: unknown): MealPlan {
  const plan = raw as Partial<MealPlan> & {
    recipes?: { recipe_id: string; servings_override: number | null }[];
    slots?: (PlanSlot | { day?: string; date?: string; leftovers_of?: string; meal: 'dinner'; mode: PlanSlot['mode']; recipe_id?: string; servings_override: number | null; notes?: string })[];
  };
  const thisMonday = toLocalDateString(getWeekStart(new Date()));

  // Helper: WeekDay key → ISO date for the current week.
  const wdToISO = (wd: string | undefined): string | undefined => {
    if (!wd) return undefined;
    const idx = WD_INDEX[wd];
    if (idx === undefined) return undefined;
    const d = new Date(thisMonday + 'T00:00:00');
    d.setDate(d.getDate() + idx);
    return toLocalDateString(d);
  };

  if (Array.isArray(plan.slots)) {
    // Phase 1 had `day`; Phase 2 has `date`. Normalise to `date`.
    const slots: PlanSlot[] = plan.slots
      .map(s => {
        if ('date' in s && typeof s.date === 'string') {
          return s as PlanSlot;
        }
        const date = wdToISO((s as { day?: string }).day);
        if (!date) return null;
        const leftovers_of =
          'leftovers_of' in s && typeof s.leftovers_of === 'string' && WD_INDEX[s.leftovers_of] !== undefined
            ? wdToISO(s.leftovers_of)
            : (s as PlanSlot).leftovers_of;
        return {
          date,
          meal: s.meal ?? 'dinner',
          mode: s.mode,
          recipe_id: s.recipe_id,
          servings_override: s.servings_override ?? null,
          leftovers_of,
          notes: s.notes,
        } as PlanSlot;
      })
      .filter((s): s is PlanSlot => s !== null);
    return {
      id: plan.id ?? generateId(),
      slots,
      status: plan.status ?? 'planning',
    };
  }

  // Phase 0: PlanRecipe[] → distribute one-per-day starting Monday this week.
  const oldRecipes = Array.isArray(plan.recipes) ? plan.recipes : [];
  const slots: PlanSlot[] = oldRecipes.slice(0, WEEK_DAYS.length).map((pr, i) => {
    const d = new Date(thisMonday + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return {
      date: toLocalDateString(d),
      meal: 'dinner',
      mode: 'cook',
      recipe_id: pr.recipe_id,
      servings_override: pr.servings_override ?? null,
    };
  });
  return {
    id: plan.id ?? generateId(),
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

/** Upsert a slot keyed by (date, meal). */
function upsertSlot(slots: PlanSlot[], next: PlanSlot): PlanSlot[] {
  const idx = slots.findIndex(s => s.date === next.date && s.meal === next.meal);
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
                src => src.date === s.leftovers_of && src.recipe_id && src.recipe_id !== action.id,
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
            s => !(s.date === action.date && s.meal === action.meal),
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
