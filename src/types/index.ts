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

export interface PlanRecipe {
  recipe_id: string;
  servings_override: number | null;
}

export interface MealPlan {
  id: string;
  week_start: string; // ISO date string: Monday of the week
  recipes: PlanRecipe[];
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
