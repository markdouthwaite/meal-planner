import { useState } from 'react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import { SlotCard } from './SlotCard';
import { SlotActions } from './SlotActions';
import { RecipesPage } from '../recipes/RecipesPage';
import { Modal } from '../ui/Modal';
import {
  formatWeekLabel,
  WEEK_DAYS, WEEK_DAY_LABELS,
} from '../../utils/helpers';
import { useIsMobile } from '../../utils/useIsMobile';
import type { PlanSlot, WeekDay } from '../../types';

const MEAL = 'dinner' as const;

export function PlanPage() {
  const { currentPlan, recipes } = useAppState();
  const dispatch = useAppDispatch();
  const [pickerForDay, setPickerForDay] = useState<WeekDay | null>(null);
  const [actionsForDay, setActionsForDay] = useState<WeekDay | null>(null);
  const isMobile = useIsMobile();

  // Phase 1: a single plan, always treated as "this week" (the load logic
  // re-anchors currentPlan.week_start to today's Monday). Multi-week storage +
  // a week navigator are deferred to Phase 2.
  const slotByDay = new Map<WeekDay, PlanSlot>();
  for (const s of currentPlan.slots) {
    if (s.meal === MEAL) slotByDay.set(s.day, s);
  }

  const recipeById = new Map<string, typeof recipes[number]>();
  for (const r of recipes) recipeById.set(r.id, r);

  const filledCount = slotByDay.size;
  const today = weekDayFromDate(new Date());

  function handleSlotTap(day: WeekDay) {
    const slot = slotByDay.get(day);
    if (!slot) {
      setPickerForDay(day);
    } else {
      setActionsForDay(day);
    }
  }

  function handlePickRecipe(recipeId: string) {
    const day = pickerForDay;
    if (!day) return;
    const existing = slotByDay.get(day);
    dispatch({
      type: 'SET_SLOT',
      slot: {
        day,
        meal: MEAL,
        mode: 'cook',
        recipe_id: recipeId,
        servings_override: existing?.servings_override ?? null,
        notes: existing?.notes,
      },
    });
    setPickerForDay(null);
  }

  function handleClearPlan() {
    if (filledCount === 0) return;
    const ok = window.confirm(
      `Clear all ${filledCount} slot${filledCount !== 1 ? 's' : ''} from this plan?\n\nYour recipes and shopping-list items aren't affected.`,
    );
    if (ok) dispatch({ type: 'CLEAR_PLAN' });
  }

  const activeSlot = actionsForDay ? slotByDay.get(actionsForDay) : null;
  const activeRecipe = (() => {
    if (!activeSlot) return undefined;
    if (activeSlot.mode === 'leftovers' && activeSlot.leftovers_of) {
      const src = slotByDay.get(activeSlot.leftovers_of);
      return src?.recipe_id ? recipeById.get(src.recipe_id) : undefined;
    }
    return activeSlot.recipe_id ? recipeById.get(activeSlot.recipe_id) : undefined;
  })();

  const cookSlots = Array.from(slotByDay.values())
    .filter(s => s.mode === 'cook' && s.recipe_id)
    .map(s => ({ day: s.day, recipe: recipeById.get(s.recipe_id!)! }))
    .filter(x => x.recipe);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sticky week header. Week navigation is deferred to Phase 2 (when
          multi-week storage exists); for now we only ever show the current
          week, so prev/next chevrons would just lead to empty states. */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            This week
          </p>
          <p className="text-sm font-semibold text-gray-800">
            Week of {formatWeekLabel(currentPlan.week_start)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {filledCount} of {WEEK_DAYS.length} planned
          </p>
        </div>
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 max-w-3xl w-full mx-auto">
        {WEEK_DAYS.map(day => {
          const slot = slotByDay.get(day);
          const recipe = slot?.recipe_id ? recipeById.get(slot.recipe_id) : undefined;
          const leftoverSource = (() => {
            if (slot?.mode !== 'leftovers' || !slot.leftovers_of) return undefined;
            const src = slotByDay.get(slot.leftovers_of);
            if (!src?.recipe_id) return undefined;
            const srcRecipe = recipeById.get(src.recipe_id);
            if (!srcRecipe) return undefined;
            return { recipe: srcRecipe, day: slot.leftovers_of };
          })();
          return (
            <SlotCard
              key={day}
              day={day}
              slot={slot}
              recipe={recipe}
              leftoverSource={leftoverSource}
              isToday={today === day}
              onTap={() => handleSlotTap(day)}
            />
          );
        })}

        {filledCount > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleClearPlan}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline px-3 py-2"
            >
              Clear plan
            </button>
          </div>
        )}
      </div>

      {/* Recipe picker for an empty (or "change recipe") slot */}
      <Modal
        open={pickerForDay !== null}
        onClose={() => setPickerForDay(null)}
        title={pickerForDay ? `${WEEK_DAY_LABELS[pickerForDay]} — pick a recipe` : ''}
        fullScreen={isMobile}
        wide
      >
        <div className="flex flex-col" style={{ height: isMobile ? undefined : '65vh' }}>
          <RecipesPage
            mode="picker"
            onPick={handlePickRecipe}
            pickLabel="Choose"
          />
        </div>
      </Modal>

      {/* Action sheet for a filled slot */}
      {activeSlot && (
        <SlotActions
          open
          onClose={() => setActionsForDay(null)}
          slot={activeSlot}
          recipe={activeRecipe}
          cookSlots={cookSlots}
          onPickRecipe={() => {
            setPickerForDay(activeSlot.day);
            setActionsForDay(null);
          }}
        />
      )}
    </div>
  );
}

/** Map a Date to the WeekDay key used in the plan. */
function weekDayFromDate(d: Date): WeekDay {
  // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const map: WeekDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[d.getDay()];
}
