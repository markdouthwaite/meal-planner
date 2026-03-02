import { Minus, Plus, Trash2 } from 'lucide-react';
import type { PlanRecipe, Recipe } from '../../types';
import { RecipeImage } from '../ui/RecipeImage';
import { MealTypeBadge } from '../ui/MealTypeBadge';

interface PlanMealCardProps {
  planRecipe: PlanRecipe;
  recipe: Recipe;
  onRemove: () => void;
  onServingsChange: (servings: number) => void;
}

export function PlanMealCard({ planRecipe, recipe, onRemove, onServingsChange }: PlanMealCardProps) {
  const servings = planRecipe.servings_override ?? recipe.servings;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-3 p-3 items-center">
      <RecipeImage
        src={recipe.image}
        alt={recipe.title}
        className="w-16 h-16 rounded-xl flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-1">
          {recipe.meal_type.map(t => <MealTypeBadge key={t} type={t} small />)}
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{recipe.title}</p>
        {/* Servings control */}
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={() => onServingsChange(Math.max(1, servings - 1))}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            aria-label="Decrease servings"
          >
            <Minus size={12} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[24px] text-center">
            {servings}
          </span>
          <button
            onClick={() => onServingsChange(servings + 1)}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            aria-label="Increase servings"
          >
            <Plus size={12} />
          </button>
          <span className="text-xs text-gray-400">servings</span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-2.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Remove from plan"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
