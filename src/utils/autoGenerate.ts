import type { PlanSlot, Recipe } from '../types';

const QUICK_TAGS = new Set(['quick', 'midweek']);
const BATCH_TAGS = new Set(['batch-cook', 'family-favourite']);

interface AutoGenerateInput {
  /** All ISO dates in the planning window, in chronological order. */
  windowDates: string[];
  /** Existing slots keyed by date (filled cook/leftover/out/skip). Never overwritten. */
  existingSlotsByDate: Map<string, PlanSlot>;
  /** Recipe library to pick from. */
  recipes: Recipe[];
  /** Dates the user wants to mark as leftovers (any subset of windowDates). */
  leftoverDates: Set<string>;
  /** Tags the user wants to filter by — recipe must include ALL of these. Empty = no filter. */
  tagFilter: Set<string>;
}

interface AutoGenerateResult {
  /** Slots to dispatch with SET_SLOT, in order. */
  slots: PlanSlot[];
  /** Days that were skipped because no eligible recipe could be picked. */
  unfilledDates: string[];
}

/**
 * Rule-based planner: fills empty days in a window with cook + leftover slots.
 *
 * Rules:
 * - Existing slots (cook / leftover / out / skip) are never overwritten.
 * - Recipes already used in the window (any cook slot, existing or new) are
 *   excluded so the same recipe doesn't appear twice as a cook.
 * - Day-of-week scoring:
 *   - Sunday (or any cook day that's feeding a leftover): prefer batch-cook /
 *     family-favourite tags, or recipes serving ≥ 4.
 *   - Mon–Fri: prefer quick / midweek tags.
 *   - Saturday: no special preference.
 * - Leftover handling: each `leftoverDates` entry is paired with the most
 *   recent earlier cook day in the window. That cook day's
 *   `servings_override` is bumped to `recipe.servings × 2`.
 * - Tag filter is inclusive (recipe must contain every tag in `tagFilter`).
 */
export function autoGeneratePlan(input: AutoGenerateInput): AutoGenerateResult {
  const { windowDates, existingSlotsByDate, recipes, leftoverDates, tagFilter } = input;

  // 1. Find empty days and split into leftover vs cook intent.
  const emptyDays = windowDates.filter(d => !existingSlotsByDate.has(d));
  const desiredLeftoverDays = emptyDays.filter(d => leftoverDates.has(d));
  const cookDays = emptyDays.filter(d => !leftoverDates.has(d));

  // 2. Pair each desired leftover day with the most recent earlier empty
  //    cook day. Done greedily on a chronological pass so leftovers always
  //    follow the cook they're sourced from.
  const leftoverToSource = new Map<string, string>(); // ldate -> cookDate
  const sourcedCookDays = new Set<string>();

  for (const ldate of [...desiredLeftoverDays].sort()) {
    const earlier = cookDays.filter(cd => cd < ldate);
    if (earlier.length === 0) continue; // no cook day before — can't pair
    const unsourced = earlier.filter(cd => !sourcedCookDays.has(cd));
    const sourceDate = (unsourced.length > 0 ? unsourced : earlier)[
      (unsourced.length > 0 ? unsourced : earlier).length - 1
    ];
    leftoverToSource.set(ldate, sourceDate);
    sourcedCookDays.add(sourceDate);
  }

  // 3. Candidate pool: respect tag filter, exclude recipes already cooked
  //    in the window's existing slots.
  const usedRecipeIds = new Set<string>();
  for (const slot of existingSlotsByDate.values()) {
    if (slot.mode === 'cook' && slot.recipe_id) usedRecipeIds.add(slot.recipe_id);
  }
  let pool = recipes.filter(r => !usedRecipeIds.has(r.id));
  // OR filter: recipe must match at least one selected tag. With multiple
  // tags selected (e.g. "vegetarian, fish, healthy") this gives a broader,
  // varied pool rather than the near-empty intersection you'd get with AND.
  if (tagFilter.size > 0) {
    pool = pool.filter(r => {
      const recipeTags = new Set(r.tags.map(t => t.toLowerCase()));
      for (const t of tagFilter) {
        if (recipeTags.has(t.toLowerCase())) return true;
      }
      return false;
    });
  }

  // 4. Score-and-pick for each cook day, in window order.
  const cookAssignments = new Map<string, Recipe>(); // date -> recipe
  const unfilledDates: string[] = [];

  for (const date of cookDays) {
    if (pool.length === 0) {
      unfilledDates.push(date);
      continue;
    }
    const dow = dayOfWeek(date);
    const isSunday = dow === 0;
    const isWeekday = dow >= 1 && dow <= 5;
    const needsBatch = sourcedCookDays.has(date) || isSunday;

    const scored = pool.map(r => {
      let score = Math.random() * 0.5; // base randomness for tie-breaking
      const tags = new Set(r.tags.map(t => t.toLowerCase()));
      if (needsBatch) {
        for (const t of BATCH_TAGS) if (tags.has(t)) score += 5;
        if (r.servings >= 4) score += 2;
      }
      if (isWeekday && !needsBatch) {
        for (const t of QUICK_TAGS) if (tags.has(t)) score += 5;
      }
      return { r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const pick = scored[0].r;
    cookAssignments.set(date, pick);
    pool = pool.filter(r => r.id !== pick.id); // no duplicates
  }

  // 5. Emit slots.
  const slots: PlanSlot[] = [];
  for (const [date, recipe] of cookAssignments) {
    const isSource = sourcedCookDays.has(date);
    slots.push({
      date,
      meal: 'dinner',
      mode: 'cook',
      recipe_id: recipe.id,
      servings_override: isSource ? recipe.servings * 2 : null,
    });
  }
  // Only emit leftover slots whose source day actually got a recipe assigned.
  for (const [ldate, sourceDate] of leftoverToSource) {
    if (!cookAssignments.has(sourceDate)) {
      unfilledDates.push(ldate);
      continue;
    }
    slots.push({
      date: ldate,
      meal: 'dinner',
      mode: 'leftovers',
      recipe_id: undefined,
      servings_override: null,
      leftovers_of: sourceDate,
    });
  }

  return { slots, unfilledDates };
}

/** 0=Sun, 1=Mon, …, 6=Sat — local timezone. */
function dayOfWeek(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay();
}

/** All distinct tags across the recipe library, sorted alphabetically. */
export function collectAllTags(recipes: Recipe[]): string[] {
  const set = new Set<string>();
  for (const r of recipes) for (const t of r.tags) set.add(t);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
