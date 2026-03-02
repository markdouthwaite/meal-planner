import { Users, CheckCircle, PlusCircle } from 'lucide-react';
import type { Recipe } from '../../types';
import { MealTypeBadge } from '../ui/MealTypeBadge';
import { RecipeImage } from '../ui/RecipeImage';

interface RecipeCardProps {
  recipe: Recipe;
  inPlan: boolean;
  onAddToPlan: () => void;
  onClick: () => void;
}

export function RecipeCard({ recipe, inPlan, onAddToPlan, onClick }: RecipeCardProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
      onClick={onClick}
    >
      <RecipeImage
        src={recipe.image}
        alt={recipe.title}
        className="w-full h-40 sm:h-44"
      />

      <div className="p-4 flex flex-col flex-1">
        {/* Meal type badges */}
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

        {/* Tags – max 2 visible */}
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
          <button
            onClick={e => { e.stopPropagation(); if (!inPlan) onAddToPlan(); }}
            disabled={inPlan}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] justify-center ${
              inPlan
                ? 'bg-brand-50 text-brand-600 cursor-default'
                : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
            }`}
            aria-label={inPlan ? 'Already in plan' : 'Add to plan'}
          >
            {inPlan ? (
              <><CheckCircle size={13} /> In Plan</>
            ) : (
              <><PlusCircle size={13} /> Add</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
