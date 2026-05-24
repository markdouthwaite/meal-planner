import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import { SlotCard } from './SlotCard';
import { SlotActions } from './SlotActions';
import { RecipesPage } from '../recipes/RecipesPage';
import { Modal } from '../ui/Modal';
import {
  todayISO, addDaysISO, formatDateRange, formatDayLong, daysBetweenISO,
} from '../../utils/helpers';
import { useIsMobile } from '../../utils/useIsMobile';
import type { PlanSlot } from '../../types';

const MEAL = 'dinner' as const;
const WINDOW_DAYS = 7;
const MAX_FUTURE_OFFSET = 14;

export function PlanPage() {
  const { currentPlan, recipes } = useAppState();
  const dispatch = useAppDispatch();
  const [pickerForDate, setPickerForDate] = useState<string | null>(null);
  const [actionsForDate, setActionsForDate] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const today = todayISO();

  // Window state — default: today + 6 days. If the page was left open across
  // a day boundary, an old windowStart could now be in the past; derive an
  // effective start that's clamped to today before any date arithmetic.
  const [storedStart, setStoredStart] = useState<string>(() => today);
  const windowStart = daysBetweenISO(today, storedStart) < 0 ? today : storedStart;
  const setWindowStart = setStoredStart;

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const windowEnd = addDaysISO(windowStart, WINDOW_DAYS - 1);
  const windowDates: string[] = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    addDaysISO(windowStart, i),
  );
  const minStart = today;
  const maxStart = addDaysISO(today, MAX_FUTURE_OFFSET);

  // Slot lookup by date, scoped to the current window.
  const slotByDate = new Map<string, PlanSlot>();
  for (const s of currentPlan.slots) {
    if (s.meal === MEAL) slotByDate.set(s.date, s);
  }

  const recipeById = new Map<string, typeof recipes[number]>();
  for (const r of recipes) recipeById.set(r.id, r);

  const slotsInWindow = windowDates
    .map(d => slotByDate.get(d))
    .filter((s): s is PlanSlot => !!s);
  const filledCount = slotsInWindow.length;

  function handleSlotTap(date: string) {
    setActionsForDate(date);
  }

  function handlePickRecipe(recipeId: string) {
    const date = pickerForDate;
    if (!date) return;
    const existing = slotByDate.get(date);
    dispatch({
      type: 'SET_SLOT',
      slot: {
        date,
        meal: MEAL,
        mode: 'cook',
        recipe_id: recipeId,
        servings_override: existing?.servings_override ?? null,
        notes: existing?.notes,
      },
    });
    setPickerForDate(null);
  }

  function handleClearWindow() {
    if (filledCount === 0) return;
    const ok = window.confirm(
      `Clear all ${filledCount} slot${filledCount !== 1 ? 's' : ''} from this window?\n\nSlots outside the current 7-day window are not affected.`,
    );
    if (ok) {
      for (const s of slotsInWindow) {
        dispatch({ type: 'CLEAR_SLOT', date: s.date, meal: MEAL });
      }
    }
  }

  const activeSlot = actionsForDate ? slotByDate.get(actionsForDate) : undefined;
  const activeRecipe = (() => {
    if (!activeSlot) return undefined;
    if (activeSlot.mode === 'leftovers' && activeSlot.leftovers_of) {
      const src = slotByDate.get(activeSlot.leftovers_of);
      return src?.recipe_id ? recipeById.get(src.recipe_id) : undefined;
    }
    return activeSlot.recipe_id ? recipeById.get(activeSlot.recipe_id) : undefined;
  })();

  // Cook-slot candidates for "leftovers of…" — slots elsewhere in the window
  // with a known recipe.
  const cookSlots = slotsInWindow
    .filter(s => s.mode === 'cook' && s.recipe_id)
    .map(s => ({ date: s.date, recipe: recipeById.get(s.recipe_id!)! }))
    .filter(x => x.recipe);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sticky header with window range + date-pick affordance */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="text-center relative">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Planning
          </p>
          <button
            onClick={() => {
              setDatePickerOpen(true);
              // Defer to next tick so the input is mounted before we focus it.
              setTimeout(() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-brand-600 transition-colors"
            aria-label="Change start date"
          >
            <CalendarDays size={14} className="text-gray-400" />
            {formatDateRange(windowStart, windowEnd)}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {filledCount} of {WINDOW_DAYS} planned
            {windowStart !== today && (
              <button
                onClick={() => setWindowStart(today)}
                className="ml-2 text-brand-600 hover:underline"
              >
                Reset to today
              </button>
            )}
          </p>
          {datePickerOpen && (
            <input
              ref={dateInputRef}
              type="date"
              value={windowStart}
              min={minStart}
              max={maxStart}
              onChange={e => {
                if (e.target.value) setWindowStart(e.target.value);
              }}
              onBlur={() => setDatePickerOpen(false)}
              // Invisible — purely to host the native date picker UI.
              className="absolute opacity-0 inset-0 pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 max-w-3xl w-full mx-auto">
        {windowDates.map(date => {
          const slot = slotByDate.get(date);
          const recipe = slot?.recipe_id ? recipeById.get(slot.recipe_id) : undefined;
          const leftoverSource = (() => {
            if (slot?.mode !== 'leftovers' || !slot.leftovers_of) return undefined;
            const src = slotByDate.get(slot.leftovers_of);
            if (!src?.recipe_id) return undefined;
            const srcRecipe = recipeById.get(src.recipe_id);
            if (!srcRecipe) return undefined;
            return { recipe: srcRecipe, date: slot.leftovers_of };
          })();
          return (
            <SlotCard
              key={date}
              date={date}
              slot={slot}
              recipe={recipe}
              leftoverSource={leftoverSource}
              isToday={date === today}
              onTap={() => handleSlotTap(date)}
            />
          );
        })}

        {filledCount > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleClearWindow}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline px-3 py-2"
            >
              Clear this window
            </button>
          </div>
        )}
      </div>

      {/* Recipe picker for a slot */}
      <Modal
        open={pickerForDate !== null}
        onClose={() => setPickerForDate(null)}
        title={pickerForDate ? `${formatDayLong(pickerForDate)} — pick a recipe` : ''}
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

      {/* Action sheet — handles both empty (4-way choice) and filled slots */}
      {actionsForDate && (
        <SlotActions
          open
          onClose={() => setActionsForDate(null)}
          date={actionsForDate}
          slot={activeSlot}
          recipe={activeRecipe}
          cookSlots={cookSlots}
          onPickRecipe={() => {
            setPickerForDate(actionsForDate);
            setActionsForDate(null);
          }}
        />
      )}
    </div>
  );
}
