import { ChevronRight, Plus, RotateCw, Utensils, X } from 'lucide-react';
import type { PlanSlot, Recipe, WeekDay } from '../../types';
import { WEEK_DAY_LABELS } from '../../utils/helpers';
import { RecipeImage } from '../ui/RecipeImage';

interface SlotCardProps {
  day: WeekDay;
  slot: PlanSlot | undefined;
  recipe: Recipe | undefined;
  /** For leftover slots, the recipe being re-eaten (looked up via leftovers_of). */
  leftoverSource?: { recipe: Recipe; day: WeekDay };
  /** True if today's row, so we can highlight it. */
  isToday: boolean;
  onTap: () => void;
}

/**
 * One day's slot in the weekly plan. The whole card is one big tap target:
 * - empty → opens the recipe picker
 * - filled → opens the quick-actions sheet
 *
 * Visual states (cook / leftovers / out / skip / empty) share the same row
 * height so the week list doesn't jump when the user changes a mode.
 */
export function SlotCard({ day, slot, recipe, leftoverSource, isToday, onTap }: SlotCardProps) {
  const dayLabel = WEEK_DAY_LABELS[day];

  // ---- empty ----
  if (!slot) {
    return (
      <button
        onClick={onTap}
        className={`group w-full text-left bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe day={dayLabel} isToday={isToday} />
          <div className="flex-1 flex items-center justify-between px-4 py-3 text-gray-400 group-hover:text-brand-600 transition-colors">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Plus size={16} />
              What shall we have?
            </span>
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </button>
    );
  }

  // ---- out / skip ----
  if (slot.mode === 'out' || slot.mode === 'skip') {
    const label = slot.mode === 'out' ? 'Eating out' : 'Skipping';
    const icon = slot.mode === 'out' ? <Utensils size={16} /> : <X size={16} />;
    return (
      <button
        onClick={onTap}
        className={`w-full text-left bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe day={dayLabel} isToday={isToday} />
          <div className="flex-1 flex items-center justify-between px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500">
              {icon}
              {label}
              {slot.notes && <span className="text-gray-400 font-normal">· {slot.notes}</span>}
            </span>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        </div>
      </button>
    );
  }

  // ---- leftovers ----
  if (slot.mode === 'leftovers') {
    const sourceRecipe = leftoverSource?.recipe;
    const sourceDay = leftoverSource ? WEEK_DAY_LABELS[leftoverSource.day] : undefined;
    return (
      <button
        onClick={onTap}
        className={`w-full text-left bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe day={dayLabel} isToday={isToday} />
          <RecipeImage
            src={sourceRecipe?.image}
            alt={sourceRecipe?.title ?? 'Leftovers'}
            title={sourceRecipe?.title}
            mealTypes={sourceRecipe?.meal_type}
            className="w-20 h-full flex-shrink-0"
          />
          <div className="flex-1 flex items-center justify-between gap-2 px-3 py-3 min-w-0">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-600 mb-0.5">
                <RotateCw size={11} />
                Leftovers
                {sourceDay && <span className="text-gray-400 font-normal normal-case tracking-normal">· from {sourceDay}</span>}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {sourceRecipe?.title ?? 'Recipe missing'}
              </p>
              {slot.notes && (
                <p className="text-xs text-gray-400 truncate">{slot.notes}</p>
              )}
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </div>
        </div>
      </button>
    );
  }

  // ---- cook ----
  const servings = slot.servings_override ?? recipe?.servings ?? 0;
  const isDouble = recipe ? servings >= recipe.servings * 2 : false;
  return (
    <button
      onClick={onTap}
      className={`w-full text-left bg-white rounded-2xl border ${
        isToday ? 'border-brand-300' : 'border-gray-100'
      } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
    >
      <div className="flex items-stretch min-h-[80px]">
        <DayStripe day={dayLabel} isToday={isToday} />
        <RecipeImage
          src={recipe?.image}
          alt={recipe?.title ?? 'Recipe'}
          title={recipe?.title}
          mealTypes={recipe?.meal_type}
          className="w-20 h-full flex-shrink-0"
        />
        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {recipe?.title ?? 'Recipe missing'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
              <span>{servings} servings</span>
              {isDouble && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold tracking-wide">
                  COOK ×2
                </span>
              )}
            </div>
            {slot.notes && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{slot.notes}</p>
            )}
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </div>
      </div>
    </button>
  );
}

function DayStripe({ day, isToday }: { day: string; isToday: boolean }) {
  return (
    <div className={`w-20 flex-shrink-0 flex flex-col items-center justify-center px-2 py-3 ${
      isToday ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-500'
    }`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {isToday ? 'Today' : ''}
      </span>
      <span className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
        {day}
      </span>
    </div>
  );
}
