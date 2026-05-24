import { useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronDown, Sparkles } from 'lucide-react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import { SlotCard, type QuickAction } from './SlotCard';
import { SlotActions } from './SlotActions';
import { AutoGenerateSheet } from './AutoGenerateSheet';
import { RecipesPage } from '../recipes/RecipesPage';
import { RecipeDetail } from '../recipes/RecipeDetail';
import { Modal } from '../ui/Modal';
import type { Recipe } from '../../types';
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
  const [actionsInitialView, setActionsInitialView] = useState<'pickingSource' | undefined>(undefined);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const isMobile = useIsMobile();

  const today = todayISO();

  // Window state — default: today + 6 days. If the page was left open across
  // a day boundary, an old windowStart could now be in the past; derive an
  // effective start that's clamped to today before any date arithmetic.
  const [storedStart, setStoredStart] = useState<string>(() => today);
  const windowStart = daysBetweenISO(today, storedStart) < 0 ? today : storedStart;
  const setWindowStart = setStoredStart;

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

  function handleSlotTap(date: string) {
    setActionsInitialView(undefined);
    setActionsForDate(date);
  }

  function handleQuickAction(date: string, action: QuickAction) {
    switch (action) {
      case 'recipe':
        setPickerForDate(date);
        break;
      case 'leftovers':
        setActionsInitialView('pickingSource');
        setActionsForDate(date);
        break;
      case 'out':
        dispatch({
          type: 'SET_SLOT',
          slot: { date, meal: MEAL, mode: 'out', servings_override: null },
        });
        break;
      case 'skip':
        dispatch({
          type: 'SET_SLOT',
          slot: { date, meal: MEAL, mode: 'skip', servings_override: null },
        });
        break;
    }
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

  function handleClearPlan() {
    const total = currentPlan.slots.length;
    if (total === 0) return;
    const ok = window.confirm(
      `Clear all ${total} planned meal${total !== 1 ? 's' : ''} from your plan?`,
    );
    if (ok) dispatch({ type: 'CLEAR_PLAN' });
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
      {/* Sticky single-row toolbar: date range on the left, action icons on
          the right. The native date input is always mounted but visually
          invisible, layered over the formatted label so taps land directly
          on the input (no JS showPicker() gymnastics). */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <input
              type="date"
              value={windowStart}
              min={minStart}
              max={maxStart}
              onChange={e => { if (e.target.value) setWindowStart(e.target.value); }}
              aria-label="Change planning start date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 px-2 py-2">
              <CalendarDays size={16} className="text-gray-400" />
              {formatDateRange(windowStart, windowEnd)}
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            {windowStart !== today && (
              <button
                onClick={() => setWindowStart(today)}
                className="px-2.5 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg min-h-[36px]"
                aria-label="Reset to today"
              >
                Today
              </button>
            )}
            <ToolbarAction
              icon={<Sparkles size={16} />}
              label="Auto-generate plan"
              onClick={() => setAutoGenOpen(true)}
            />
            <ToolbarAction
              icon={<CalendarPlus size={16} />}
              label="Export to calendar (coming soon)"
            />
          </div>
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
              onQuickAction={(action) => handleQuickAction(date, action)}
            />
          );
        })}

        {currentPlan.slots.length > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleClearPlan}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline px-3 py-2"
            >
              Clear your plan
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

      {/* Action sheet — handles both empty (4-way choice) and filled slots,
          and can be opened pre-positioned on the day-source picker via the
          "Leftover" quick-action shortcut. */}
      {actionsForDate && (
        <SlotActions
          open
          onClose={() => {
            setActionsForDate(null);
            setActionsInitialView(undefined);
          }}
          date={actionsForDate}
          slot={activeSlot}
          recipe={activeRecipe}
          cookSlots={cookSlots}
          initialView={actionsInitialView}
          onPickRecipe={() => {
            setPickerForDate(actionsForDate);
            setActionsForDate(null);
            setActionsInitialView(undefined);
          }}
          onViewRecipe={activeRecipe ? () => {
            setViewingRecipe(activeRecipe);
            setActionsForDate(null);
            setActionsInitialView(undefined);
          } : undefined}
        />
      )}

      {/* Read-only recipe view from a slot. No add/edit/delete CTAs since
          the user came in via the planner; recipe editing belongs to the
          Recipes tab. */}
      {viewingRecipe && (
        <RecipeDetail
          recipe={viewingRecipe}
          open
          onClose={() => setViewingRecipe(null)}
          inPlan={true}
        />
      )}

      {/* Auto-generate sheet */}
      <AutoGenerateSheet
        open={autoGenOpen}
        onClose={() => setAutoGenOpen(false)}
        windowDates={windowDates}
        existingSlotsByDate={slotByDate}
        recipes={recipes}
      />
    </div>
  );
}

/**
 * Toolbar icon button. With `onClick`, renders an enabled, hoverable button;
 * without one, renders a disabled placeholder (for actions that aren't built
 * yet — e.g. "Export to calendar").
 */
function ToolbarAction({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  if (!onClick) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        title={label}
        className="p-2 rounded-lg text-gray-300 cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
      >
        {icon}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
    >
      {icon}
    </button>
  );
}
