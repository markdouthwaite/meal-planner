import { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, MinusCircle, PlusCircle,
  Replace, RotateCw, Trash2, Utensils, X,
} from 'lucide-react';
import type { PlanSlot, Recipe, WeekDay } from '../../types';
import { WEEK_DAY_LABELS } from '../../utils/helpers';
import { useAppDispatch } from '../../store/AppContext';

interface SlotActionsProps {
  open: boolean;
  onClose: () => void;
  /** The current slot being acted on (always defined when open=true). */
  slot: PlanSlot;
  /** The recipe for cook slots, or for leftovers the source-day recipe. */
  recipe: Recipe | undefined;
  /** Cook slots in the same plan (used as candidates for "make leftovers of..."). */
  cookSlots: { day: WeekDay; recipe: Recipe }[];
  /** Caller opens the recipe picker for the same slot. */
  onPickRecipe: () => void;
}

/**
 * Bottom-sheet of quick actions for an already-filled slot. The set of actions
 * depends on `slot.mode`.
 */
export function SlotActions({ open, onClose, slot, recipe, cookSlots, onPickRecipe }: SlotActionsProps) {
  const dispatch = useAppDispatch();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(slot.notes ?? '');
  const [pickingSource, setPickingSource] = useState(false);

  // Caller controls mount via `open={true}` — we don't need to reset state on
  // open/close ourselves. Just lock body scroll for the lifetime of the sheet.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!open) return null;

  const dayLabel = WEEK_DAY_LABELS[slot.day];
  const servings = slot.servings_override ?? recipe?.servings ?? 0;
  const isDouble = recipe ? servings >= recipe.servings * 2 : false;

  function update(next: Partial<PlanSlot>) {
    dispatch({ type: 'SET_SLOT', slot: { ...slot, ...next } });
  }

  function clear() {
    dispatch({ type: 'CLEAR_SLOT', day: slot.day, meal: slot.meal });
    onClose();
  }

  function setMode(mode: PlanSlot['mode']) {
    if (mode === 'cook' && !slot.recipe_id) {
      onPickRecipe();
      onClose();
      return;
    }
    if (mode === 'leftovers') {
      setPickingSource(true);
      return;
    }
    if (mode === 'cook') {
      update({ mode: 'cook', leftovers_of: undefined });
    } else {
      update({ mode, recipe_id: undefined, leftovers_of: undefined, servings_override: null });
    }
  }

  // Sub-screen: pick which cook day this slot is leftovers of.
  if (pickingSource) {
    return (
      <Sheet onClose={onClose}>
        <Header
          onBack={() => setPickingSource(false)}
          title="Leftovers of…"
          subtitle={dayLabel}
        />
        <div className="p-4 pb-safe">
          {cookSlots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No cook slots in this week to re-use yet. Pick a recipe for another day first.
            </p>
          ) : (
            <ul className="space-y-2">
              {cookSlots
                .filter(c => c.day !== slot.day) // can't be leftovers of itself
                .map(({ day, recipe: r }) => (
                  <li key={day}>
                    <button
                      onClick={() => {
                        update({ mode: 'leftovers', leftovers_of: day, recipe_id: undefined, servings_override: null });
                        onClose();
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{WEEK_DAY_LABELS[day]}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <Header title={dayLabel} subtitle={recipe?.title ?? modeLabel(slot.mode)} onClose={onClose} />

      <div className="px-4 pb-safe">
        {/* ── Cook slot actions ─────────────────────────────────────────── */}
        {slot.mode === 'cook' && recipe && (
          <>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-gray-700">Servings</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => update({ servings_override: Math.max(1, servings - 1) })}
                  className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  aria-label="Decrease servings"
                >
                  <MinusCircle size={20} />
                </button>
                <span className="text-base font-semibold text-gray-900 tabular-nums min-w-[24px] text-center">
                  {servings}
                </span>
                <button
                  onClick={() => update({ servings_override: servings + 1 })}
                  className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  aria-label="Increase servings"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={() => update({
                servings_override: isDouble ? null : recipe.servings * 2,
              })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors mb-2 ${
                isDouble
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium inline-flex items-center gap-2">
                <RotateCw size={16} />
                Cook double {isDouble && '· on'}
              </span>
              <span className="text-xs text-gray-400">
                {isDouble ? `${recipe.servings * 2} servings` : `from ${recipe.servings}`}
              </span>
            </button>

            <ActionRow icon={<Replace size={16} />} label="Change recipe" onClick={() => { onPickRecipe(); onClose(); }} />
            <ActionRow icon={<RotateCw size={16} />} label="Make this leftovers of…" onClick={() => setMode('leftovers')} />
            <ActionRow icon={<Utensils size={16} />} label="Eating out instead" onClick={() => setMode('out')} />
            <ActionRow icon={<X size={16} />} label="Skip this meal" onClick={() => setMode('skip')} />
          </>
        )}

        {/* ── Leftovers slot actions ────────────────────────────────────── */}
        {slot.mode === 'leftovers' && (
          <>
            <ActionRow
              icon={<ChevronRight size={16} />}
              label={`Source: ${slot.leftovers_of ? WEEK_DAY_LABELS[slot.leftovers_of] : '—'}`}
              sublabel="Change source day"
              onClick={() => setPickingSource(true)}
            />
            <ActionRow icon={<Replace size={16} />} label="Cook fresh instead" onClick={() => { onPickRecipe(); onClose(); }} />
            <ActionRow icon={<Utensils size={16} />} label="Eating out instead" onClick={() => setMode('out')} />
            <ActionRow icon={<X size={16} />} label="Skip this meal" onClick={() => setMode('skip')} />
          </>
        )}

        {/* ── Out / Skip slot actions ───────────────────────────────────── */}
        {(slot.mode === 'out' || slot.mode === 'skip') && (
          <>
            <ActionRow icon={<Replace size={16} />} label="Pick a recipe" onClick={() => { onPickRecipe(); onClose(); }} />
            <ActionRow
              icon={slot.mode === 'out' ? <X size={16} /> : <Utensils size={16} />}
              label={slot.mode === 'out' ? 'Switch to skipped' : 'Switch to eating out'}
              onClick={() => setMode(slot.mode === 'out' ? 'skip' : 'out')}
            />
          </>
        )}

        {/* ── Notes (all modes) ─────────────────────────────────────────── */}
        <div className="pt-2 pb-2">
          {editingNote ? (
            <div className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Add a note (e.g. back late, low effort)"
                rows={2}
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    update({ notes: noteDraft.trim() || undefined });
                    setEditingNote(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  Save note
                </button>
                <button
                  onClick={() => { setEditingNote(false); setNoteDraft(slot.notes ?? ''); }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <ActionRow
              icon={<ChevronRight size={16} />}
              label={slot.notes ? 'Edit note' : 'Add note'}
              sublabel={slot.notes}
              onClick={() => setEditingNote(true)}
            />
          )}
        </div>

        {/* ── Clear ─────────────────────────────────────────────────────── */}
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={clear}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <Trash2 size={15} />
            Clear slot
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function modeLabel(m: PlanSlot['mode']): string {
  switch (m) {
    case 'cook': return 'Cooking';
    case 'leftovers': return 'Leftovers';
    case 'out': return 'Eating out';
    case 'skip': return 'Skipping';
  }
}

// ---------------------------------------------------------------------------
// Visual primitives
// ---------------------------------------------------------------------------

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl"
      >
        <div className="sm:hidden w-12 h-1 rounded-full bg-gray-200 mx-auto mt-2 mb-1" />
        {children}
      </div>
    </>
  );
}

function Header({
  title, subtitle, onClose, onBack,
}: { title: string; subtitle?: string; onClose?: () => void; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 rounded-full text-gray-500 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
        {subtitle && <p className="text-sm font-medium text-gray-900 truncate">{subtitle}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Close">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function ActionRow({
  icon, label, sublabel, onClick,
}: { icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 transition-colors"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="text-gray-500 flex-shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-800">{label}</span>
          {sublabel && <span className="block text-xs text-gray-400 truncate">{sublabel}</span>}
        </span>
      </span>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  );
}
