import { BookOpen, ChevronRight, RotateCw, X } from 'lucide-react';
import type { PlanSlot, Recipe } from '../../types';
import { formatDayStripe, formatDayLong } from '../../utils/helpers';
import { RecipeImage } from '../ui/RecipeImage';

export type QuickAction = 'recipe' | 'leftovers' | 'skip';

interface SlotCardProps {
  date: string; // ISO YYYY-MM-DD
  slot: PlanSlot | undefined;
  recipe: Recipe | undefined;
  /** For leftover slots, the recipe being re-eaten (looked up via leftovers_of). */
  leftoverSource?: { recipe: Recipe; date: string };
  /** True if this card is today's row, so we can highlight it. */
  isToday: boolean;
  /** Tap handler for filled slots — opens the quick-actions sheet. */
  onTap: () => void;
  /** Quick-action handler for empty slots — fired by the inline chips. */
  onQuickAction: (action: QuickAction) => void;
}

/**
 * One day's slot in the weekly plan.
 * - Empty → inline quick-action chips (recipe / leftover / skip), no
 *   card-level tap (the chips are the only affordances).
 * - Filled → whole card is the tap target, opens the actions sheet.
 */
export function SlotCard({
  date, slot, recipe, leftoverSource, isToday, onTap, onQuickAction,
}: SlotCardProps) {
  // ---- empty ----
  if (!slot) {
    return (
      <div
        className={`w-full bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe date={date} isToday={isToday} />
          <div className="flex-1 px-3 py-3 flex flex-wrap items-center gap-1.5">
            <Chip
              icon={<BookOpen size={12} />}
              label="Recipe"
              onClick={() => onQuickAction('recipe')}
              primary
            />
            <Chip
              icon={<RotateCw size={12} />}
              label="Leftover"
              onClick={() => onQuickAction('leftovers')}
            />
            <Chip
              icon={<X size={12} />}
              label="Skip"
              onClick={() => onQuickAction('skip')}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- skip ----
  if (slot.mode === 'skip') {
    const label = 'Skipping';
    const icon = <X size={16} />;
    return (
      <button
        onClick={onTap}
        className={`w-full text-left bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe date={date} isToday={isToday} />
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
    const sourceDay = leftoverSource ? formatDayLong(leftoverSource.date) : undefined;
    return (
      <button
        onClick={onTap}
        className={`w-full text-left bg-white rounded-2xl border ${
          isToday ? 'border-brand-300' : 'border-gray-100'
        } shadow-card hover:shadow-card-hover transition-all overflow-hidden`}
      >
        <div className="flex items-stretch min-h-[80px]">
          <DayStripe date={date} isToday={isToday} />
          <div className="w-20 flex-shrink-0 self-stretch overflow-hidden">
            <RecipeImage
              src={sourceRecipe?.image}
              alt={sourceRecipe?.title ?? 'Leftovers'}
              title={sourceRecipe?.title}
              mealTypes={sourceRecipe?.meal_type}
              className="w-full h-full block"
            />
          </div>
          <div className="flex-1 flex items-center justify-between gap-2 px-3 py-3 min-w-0">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-600 mb-0.5">
                <RotateCw size={11} />
                Leftovers
                {sourceDay && <span className="text-gray-400 font-normal normal-case tracking-normal">· from {sourceDay}</span>}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {sourceRecipe?.title ?? 'Source missing'}
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
        <DayStripe date={date} isToday={isToday} />
        <div className="w-20 flex-shrink-0 self-stretch overflow-hidden">
          <RecipeImage
            src={recipe?.image}
            alt={recipe?.title ?? 'Recipe'}
            title={recipe?.title}
            mealTypes={recipe?.meal_type}
            className="w-full h-full block"
          />
        </div>
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

function DayStripe({ date, isToday }: { date: string; isToday: boolean }) {
  const { weekday, day } = formatDayStripe(date);
  return (
    <div className={`w-20 flex-shrink-0 flex flex-col items-center justify-center px-2 py-3 ${
      isToday ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-500'
    }`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {isToday ? 'Today' : weekday}
      </span>
      <span className={`text-base font-bold ${isToday ? 'text-brand-700' : 'text-gray-800'}`}>
        {isToday ? weekday : day}
      </span>
    </div>
  );
}

function Chip({
  icon, label, onClick, primary,
}: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors min-h-[36px] ${
        primary
          ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
