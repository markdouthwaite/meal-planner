import { useMemo } from 'react';
import type { MealPlan, Recipe } from '../../types';
import { MEAL_TYPE_LABELS } from '../../utils/helpers';

interface MealTypeTrackerProps {
  plan: MealPlan;
  recipes: Recipe[];
}

const TRACKED_TYPES = ['breakfast', 'lunch', 'dinner', 'baby'] as const;

const TRACKER_COLOURS: Record<string, string> = {
  breakfast: 'text-amber-600 bg-amber-50 border-amber-200',
  lunch:     'text-sky-600 bg-sky-50 border-sky-200',
  dinner:    'text-indigo-600 bg-indigo-50 border-indigo-200',
  baby:      'text-pink-600 bg-pink-50 border-pink-200',
};

export function MealTypeTracker({ plan, recipes }: MealTypeTrackerProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, baby: 0 };
    for (const pr of plan.recipes) {
      const recipe = recipes.find(r => r.id === pr.recipe_id);
      if (!recipe) continue;
      for (const type of recipe.meal_type) {
        if (type in map) map[type]++;
      }
    }
    return map;
  }, [plan, recipes]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {TRACKED_TYPES.map(type => (
        <div
          key={type}
          className={`flex flex-col items-center justify-center py-3 rounded-xl border text-center ${TRACKER_COLOURS[type]}`}
        >
          <span className="text-2xl font-bold">{counts[type]}</span>
          <span className="text-xs font-medium mt-0.5">{MEAL_TYPE_LABELS[type]}</span>
        </div>
      ))}
    </div>
  );
}
