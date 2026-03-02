import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import { PlanMealCard } from './PlanMealCard';
import { MealTypeTracker } from './MealTypeTracker';
import { RecipesPage } from '../recipes/RecipesPage';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { formatWeekLabel, addWeeks, isCurrentWeek } from '../../utils/helpers';
import { useIsMobile } from '../../utils/useIsMobile';

export function PlanPage() {
  const { currentPlan, recipes } = useAppState();
  const dispatch = useAppDispatch();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddMeals, setShowAddMeals] = useState(false);
  const isMobile = useIsMobile();

  const displayedWeek = addWeeks(currentPlan.week_start, weekOffset);
  const planRecipes = currentPlan.recipes;
  const isCurrent = isCurrentWeek(displayedWeek);

  function handleRemove(recipeId: string) {
    dispatch({ type: 'REMOVE_FROM_PLAN', recipeId });
  }

  function handleServings(recipeId: string, servings: number) {
    dispatch({ type: 'SET_SERVINGS_OVERRIDE', recipeId, servings });
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Week header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {isCurrent ? 'This Week' : weekOffset > 0 ? 'Upcoming' : 'Past'}
            </p>
            <p className="text-sm font-semibold text-gray-800">
              Week of {formatWeekLabel(displayedWeek)}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Meal type tracker */}
        <MealTypeTracker plan={currentPlan} recipes={recipes} />
      </div>

      {/* Meal list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-w-3xl w-full mx-auto">
        {planRecipes.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={56} />}
            title="No meals planned yet"
            description="Add meals from your recipe collection to start planning your week."
            action={
              <button
                onClick={() => setShowAddMeals(true)}
                className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Browse Recipes
              </button>
            }
          />
        ) : (
          <>
            {planRecipes.map(pr => {
              const recipe = recipes.find(r => r.id === pr.recipe_id);
              if (!recipe) return null;
              return (
                <PlanMealCard
                  key={pr.recipe_id}
                  planRecipe={pr}
                  recipe={recipe}
                  onRemove={() => handleRemove(pr.recipe_id)}
                  onServingsChange={(s: number) => handleServings(pr.recipe_id, s)}
                />
              );
            })}
            <button
              onClick={() => setShowAddMeals(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center justify-center gap-2 min-h-[56px]"
            >
              <Plus size={16} /> Add more meals
            </button>
          </>
        )}
      </div>

      {/* Add Meals Modal – embeds RecipesPage */}
      <Modal
        open={showAddMeals}
        onClose={() => setShowAddMeals(false)}
        title="Add Meals to Plan"
        fullScreen={isMobile}
        wide
      >
        {/* min-h ensures a usable height on desktop; RecipesPage scrolls internally */}
        <div className="flex flex-col" style={{ height: isMobile ? undefined : '65vh' }}>
          <RecipesPage mode="picker" />
        </div>
      </Modal>
    </div>
  );
}
