import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { PlanSlot, Recipe } from '../../types';
import { formatDayShort, formatDateMedium } from '../../utils/helpers';
import { autoGeneratePlan, collectAllTags } from '../../utils/autoGenerate';
import { useAppDispatch } from '../../store/AppContext';

interface AutoGenerateSheetProps {
  open: boolean;
  onClose: () => void;
  windowDates: string[];
  existingSlotsByDate: Map<string, PlanSlot>;
  recipes: Recipe[];
}

/**
 * Modal that gathers options (leftover days, tag filter) and triggers
 * autoGeneratePlan + dispatches the resulting slots. Non-destructive —
 * existing slots in the window are never touched.
 */
export function AutoGenerateSheet({
  open, onClose, windowDates, existingSlotsByDate, recipes,
}: AutoGenerateSheetProps) {
  const dispatch = useAppDispatch();
  const [selectedLeftoverDates, setSelectedLeftoverDates] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!open) return null;

  const emptyDates = windowDates.filter(d => !existingSlotsByDate.has(d));
  const allTags = collectAllTags(recipes);
  const hasEmpty = emptyDates.length > 0;

  function toggleDate(date: string) {
    setSelectedLeftoverDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }
  function toggleTag(tag: string) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  function handleGenerate() {
    const { slots } = autoGeneratePlan({
      windowDates,
      existingSlotsByDate,
      recipes,
      leftoverDates: selectedLeftoverDates,
      tagFilter: selectedTags,
    });
    for (const s of slots) {
      dispatch({ type: 'SET_SLOT', slot: s });
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-3xl"
      >
        <div className="sm:hidden w-12 h-1 rounded-full bg-gray-200 mx-auto mt-2 mb-1" />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Auto-generate plan</p>
            <p className="text-xs text-gray-400">Fills empty days — never overwrites your picks.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 pb-safe">
          {!hasEmpty ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Every day in this window already has a slot. Clear or change something to get an empty day.
            </p>
          ) : (
            <>
              {/* Leftover days */}
              <Section
                title="Leftover days"
                hint="Pick any empty day you'd like to be a leftover of an earlier cook."
              >
                <div className="flex flex-wrap gap-1.5">
                  {emptyDates.map(date => {
                    const active = selectedLeftoverDates.has(date);
                    return (
                      <Chip key={date} active={active} onClick={() => toggleDate(date)}>
                        <span className="text-[10px] uppercase tracking-wider opacity-70">
                          {formatDayShort(date)}
                        </span>
                        <span className="ml-1 font-semibold">{formatDateMedium(date)}</span>
                      </Chip>
                    );
                  })}
                </div>
              </Section>

              {/* Tag filter */}
              {allTags.length > 0 && (
                <Section
                  title="Filter by tag"
                  hint="Only consider recipes that have all selected tags."
                >
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => {
                      const active = selectedTags.has(tag);
                      return (
                        <Chip key={tag} active={active} onClick={() => toggleTag(tag)}>
                          {tag}
                        </Chip>
                      );
                    })}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!hasEmpty}
              className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{title}</p>
      {hint && <p className="text-[11px] text-gray-400 mb-2 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[34px] ${
        active
          ? 'bg-brand-600 text-white border-brand-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
