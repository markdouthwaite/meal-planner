import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { Carrot } from 'lucide-react';
import type { Recipe, MealPlan, ShoppingItem, PlanSlot } from '../types';
import { generateId } from '../utils/helpers';
import { loadAppData, db } from './db';

interface AppState {
  recipes: Recipe[];
  currentPlan: MealPlan;
  shoppingItems: ShoppingItem[];
  removedRecipeItems: Set<string>;
  recipeItemQuantityOverrides: Record<string, number>;
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
  | { type: 'CLEAR_SHOPPING_LIST'; recipeItemKeys?: string[] }
  | { type: 'LOAD_STATE'; state: AppState };

function getDefaultPlan(): MealPlan {
  return {
    id: generateId(),
    slots: [],
    status: 'planning',
  };
}

const initialState: AppState = {
  recipes: [],
  currentPlan: getDefaultPlan(),
  shoppingItems: [],
  removedRecipeItems: new Set(),
  recipeItemQuantityOverrides: {},
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

    case 'CLEAR_SHOPPING_LIST': {
      // Move every currently-aggregated recipe item to the "Not needed"
      // section so the active list visibly empties. Manual items are deleted
      // outright (no "Not needed" concept for those), and quantity overrides
      // are reset.
      const newRemoved = new Set(state.removedRecipeItems);
      if (action.recipeItemKeys) {
        for (const k of action.recipeItemKeys) newRemoved.add(k);
      }
      return {
        ...state,
        shoppingItems: [],
        removedRecipeItems: newRemoved,
        recipeItemQuantityOverrides: {},
      };
    }

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}

/**
 * Persist a mutating action to Supabase. The local reducer has already produced
 * `next`; we issue the matching remote write so state survives reloads and
 * syncs across devices. Best-effort and fire-and-forget — failures are logged,
 * not surfaced (the optimistic local update has already happened).
 */
async function persistAction(
  action: Action,
  ctx: { householdId: string; planId: string; next: AppState },
): Promise<void> {
  const { householdId, planId, next } = ctx;
  switch (action.type) {
    case 'ADD_RECIPE':
      await db.insertRecipe(action.recipe, householdId);
      break;
    case 'UPDATE_RECIPE':
      await db.updateRecipe(action.recipe, householdId);
      break;
    case 'DELETE_RECIPE':
      await db.deleteRecipe(action.id);
      // The reducer also rewrites plan slots (removing/converting leftovers),
      // so resync the plan's slots to match.
      await db.replaceSlots(planId, next.currentPlan.slots);
      break;
    case 'SET_SLOT':
      await db.upsertSlot(action.slot, planId);
      break;
    case 'CLEAR_SLOT':
      await db.deleteSlot(planId, action.date, action.meal);
      break;
    case 'CLEAR_PLAN':
      await db.clearSlots(planId);
      break;
    case 'ADD_SHOPPING_ITEM':
      await db.insertShoppingItem(action.item, householdId);
      break;
    case 'TOGGLE_SHOPPING_ITEM': {
      const item = next.shoppingItems.find(i => i.id === action.id);
      if (item) await db.updateShoppingItem(action.id, { checked: item.checked });
      break;
    }
    case 'REMOVE_SHOPPING_ITEM':
      await db.deleteShoppingItem(action.id);
      break;
    case 'SET_MANUAL_ITEM_QUANTITY': {
      const item = next.shoppingItems.find(i => i.id === action.id);
      if (item) await db.updateShoppingItem(action.id, { quantity: item.quantity });
      break;
    }
    case 'TOGGLE_REMOVED_RECIPE_ITEM':
      await db.setRemovedItem(householdId, action.key, next.removedRecipeItems.has(action.key));
      break;
    case 'SET_RECIPE_ITEM_QUANTITY':
      await db.setOverride(householdId, action.key, action.quantity);
      break;
    case 'RESET_RECIPE_ITEM_QUANTITY':
      await db.deleteOverride(householdId, action.key);
      break;
    case 'CLEAR_SHOPPING_LIST':
      await db.clearShoppingItems(householdId);
      await db.replaceRemovedItems(householdId, Array.from(next.removedRecipeItems));
      await db.clearOverrides(householdId);
      break;
    case 'LOAD_STATE':
      break;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  // Set once the household/plan are known; used by the persistence wrapper.
  const householdRef = useRef<string | null>(null);
  const planRef = useRef<string | null>(null);
  // Always-current state so the dispatch wrapper can compute the next state.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initial load from Supabase (the user is already authenticated — this
  // provider only mounts inside AuthGate).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await loadAppData();
        if (cancelled) return;
        householdRef.current = data.householdId;
        planRef.current = data.planId;
        baseDispatch({
          type: 'LOAD_STATE',
          state: {
            recipes: data.recipes,
            currentPlan: data.plan,
            shoppingItems: data.shoppingItems,
            removedRecipeItems: new Set(data.removedRecipeItems),
            recipeItemQuantityOverrides: data.recipeItemQuantityOverrides,
          },
        });
      } catch (err) {
        console.error('[store] failed to load data', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dispatch wrapper: apply the action locally (optimistic), then mirror the
  // write to Supabase. Computing `next` here keeps the reducer pure.
  const dispatch = useCallback<React.Dispatch<Action>>(action => {
    if (action.type !== 'LOAD_STATE') {
      const next = reducer(stateRef.current, action);
      const householdId = householdRef.current;
      const planId = planRef.current;
      if (householdId && planId) {
        void persistAction(action, { householdId, planId, next }).catch(err =>
          console.error('[store] failed to persist', action.type, err),
        );
      }
    }
    baseDispatch(action);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Carrot size={28} className="text-brand-600 animate-pulse" strokeWidth={2.25} />
      </div>
    );
  }

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
