import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Recipe, MealPlan, ShoppingItem, PlanRecipe } from '../types';
import { getWeekStart, generateId } from '../utils/helpers';
import { SEED_RECIPES } from '../utils/seedData';

interface AppState {
  recipes: Recipe[];
  currentPlan: MealPlan;
  shoppingItems: ShoppingItem[]; // manually added + removed state
  removedRecipeItems: Set<string>; // keys of removed auto-generated items
}

type Action =
  | { type: 'ADD_RECIPE'; recipe: Recipe }
  | { type: 'UPDATE_RECIPE'; recipe: Recipe }
  | { type: 'DELETE_RECIPE'; id: string }
  | { type: 'ADD_TO_PLAN'; recipeId: string }
  | { type: 'REMOVE_FROM_PLAN'; recipeId: string }
  | { type: 'SET_SERVINGS_OVERRIDE'; recipeId: string; servings: number }
  | { type: 'ADD_SHOPPING_ITEM'; item: ShoppingItem }
  | { type: 'TOGGLE_SHOPPING_ITEM'; id: string }
  | { type: 'REMOVE_SHOPPING_ITEM'; id: string }
  | { type: 'TOGGLE_REMOVED_RECIPE_ITEM'; key: string }
  | { type: 'LOAD_STATE'; state: AppState };

function getDefaultPlan(): MealPlan {
  return {
    id: generateId(),
    week_start: getWeekStart(new Date()).toISOString().split('T')[0],
    recipes: [],
    status: 'planning',
  };
}

const initialState: AppState = {
  recipes: [],
  currentPlan: getDefaultPlan(),
  shoppingItems: [],
  removedRecipeItems: new Set(),
};

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
          recipes: state.currentPlan.recipes.filter(pr => pr.recipe_id !== action.id),
        },
      };

    case 'ADD_TO_PLAN': {
      const alreadyIn = state.currentPlan.recipes.some(pr => pr.recipe_id === action.recipeId);
      if (alreadyIn) return state;
      const planRecipe: PlanRecipe = { recipe_id: action.recipeId, servings_override: null };
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          recipes: [...state.currentPlan.recipes, planRecipe],
        },
      };
    }

    case 'REMOVE_FROM_PLAN':
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          recipes: state.currentPlan.recipes.filter(pr => pr.recipe_id !== action.recipeId),
        },
      };

    case 'SET_SERVINGS_OVERRIDE':
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          recipes: state.currentPlan.recipes.map(pr =>
            pr.recipe_id === action.recipeId
              ? { ...pr, servings_override: action.servings }
              : pr
          ),
        },
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Convert removedRecipeItems back to a Set
        parsed.removedRecipeItems = new Set(parsed.removedRecipeItems ?? []);
        dispatch({ type: 'LOAD_STATE', state: parsed });
      } else {
        // First-time load: seed with example recipes
        for (const recipe of SEED_RECIPES) {
          dispatch({ type: 'ADD_RECIPE', recipe });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage on change
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
