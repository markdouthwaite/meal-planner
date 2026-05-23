import { Users, PlusCircle } from 'lucide-react';
import type { Recipe } from '../../types';
import { MealTypeBadge } from '../ui/MealTypeBadge';
import { RecipeImage } from '../ui/RecipeImage';

interface RecipeCardProps {
  recipe: Recipe;
  inPlan: boolean;
  /**
   * If provided, renders an Add button using `addLabel`. If not, the card is
   * tap-to-open only (used in the browse-library Recipes tab where there's no
   * slot context).
   */
  onAddToPlan?: () => void;
  addLabel?: string;
  onClick: () => void;
}

export function RecipeCard({ recipe, inPlan, onAddToPlan, addLabel = 'Add', onClick }: RecipeCardProps) {
  return (
    <div
      className="group bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
      onClick={onClick}
    >
      <RecipeImage
        src={recipe.image}
        alt={recipe.title}
        title={recipe.title}
        mealTypes={recipe.meal_type}
        className="w-full aspect-[16/9] sm:aspect-auto sm:h-44"
      />

      <div className="p-4 flex flex-col flex-1">
        {recipe.meal_type.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {recipe.meal_type.map(t => (
              <MealTypeBadge key={t} type={t} small />
            ))}
          </div>
        )}

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
            {recipe.description}
          </p>
        )}

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 2 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{recipe.tags.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users size={12} />
            {recipe.servings}
          </span>
          {onAddToPlan && (
            <button
              onClick={e => { e.stopPropagation(); onAddToPlan(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] justify-center bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800"
              aria-label={addLabel}
            >
              <PlusCircle size={13} /> {addLabel}
              {inPlan && (
                <span className="opacity-80 text-[10px] font-normal ml-0.5">· in plan</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
