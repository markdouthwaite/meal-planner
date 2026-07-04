import { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, BookOpen, Leaf } from 'lucide-react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import { RecipeCard } from './RecipeCard';
import { RecipeDetail } from './RecipeDetail';
import { RecipeForm } from './RecipeForm';
import { EmptyState } from '../ui/EmptyState';
import { HEALTHY_TAG } from '../../utils/helpers';
import type { MealType, Recipe } from '../../types';

const ALL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'baby'];
const TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', baby: 'Baby',
};

interface RecipesPageProps {
  /** 'full' (default) shows add/edit/delete; 'picker' hides authoring controls */
  mode?: 'full' | 'picker';
  /**
   * When set (picker mode), tapping a recipe's "Add" button calls this with
   * the chosen recipe id instead of dispatching ADD_TO_PLAN. Lets the caller
   * (e.g. PlanPage) attach the recipe to a specific slot.
   */
  onPick?: (recipeId: string) => void;
  /** Label for the Add button when used as a slot picker. */
  pickLabel?: string;
}

export function RecipesPage({ mode = 'full', onPick, pickLabel = 'Add' }: RecipesPageProps) {
  const { recipes, currentPlan } = useAppState();
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<MealType[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);

  const planIds = useMemo(
    () => new Set(currentPlan.slots.filter(s => s.recipe_id).map(s => s.recipe_id!)),
    [currentPlan],
  );

  // Every distinct tag in the library, most-used first (ties alphabetical).
  // Tags are free text, so dedupe case-insensitively and keep the first
  // spelling we see for display.
  const allTags = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const r of recipes) {
      for (const tag of r.tags) {
        const key = tag.toLowerCase();
        const entry = counts.get(key);
        if (entry) {
          entry.count++;
        } else {
          counts.set(key, { label: tag, count: 1 });
        }
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map(e => e.label);
  }, [recipes]);

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      const matchSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchType =
        activeTypes.length === 0 ||
        activeTypes.some(t => r.meal_type.includes(t));
      const matchTags =
        activeTags.length === 0 ||
        activeTags.some(tag => r.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
      return matchSearch && matchType && matchTags;
    });
  }, [recipes, search, activeTypes, activeTags]);

  function toggleType(type: MealType) {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function toggleTag(tag: string) {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function handleAddToPlan(recipeId: string) {
    if (onPick) {
      onPick(recipeId);
    }
    // In 'full' (browse) mode the Add button is suppressed below — there's
    // nowhere to add to without slot context.
  }

  function handleSaveRecipe(recipe: Recipe) {
    if (editingRecipe) {
      dispatch({ type: 'UPDATE_RECIPE', recipe });
    } else {
      dispatch({ type: 'ADD_RECIPE', recipe });
    }
    setEditingRecipe(undefined);
    setShowAdd(false);
  }

  function handleDeleteRecipe(id: string) {
    dispatch({ type: 'DELETE_RECIPE', id });
    setSelectedRecipe(null);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Search + Add toolbar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes or tags…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
            />
          </div>
          {/* Filter toggle — only shown on mobile where filters collapse */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`sm:hidden p-2.5 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              activeTypes.length > 0 || activeTags.length > 0 || showFilters
                ? 'bg-brand-50 border-brand-300 text-brand-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={18} />
          </button>
          {mode === 'full' && (
            <button
              onClick={() => { setEditingRecipe(null); setShowAdd(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors min-h-[44px] text-sm font-semibold"
              aria-label="Add recipe"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Recipe</span>
            </button>
          )}
        </div>

        {/* Filter pills — always visible on sm+, collapsible on mobile */}
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block space-y-2`}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ALL_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px] ${
                  activeTypes.includes(type)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
            {(activeTypes.length > 0 || activeTags.length > 0) && (
              <button
                onClick={() => { setActiveTypes([]); setActiveTags([]); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-gray-700 min-h-[36px]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Tag pills — one per distinct tag in the library, most-used first */}
          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {allTags.map(tag => {
                const active = activeTags.includes(tag);
                const healthy = tag.toLowerCase() === HEALTHY_TAG;
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px] ${
                      active
                        ? healthy
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-700 text-white border-gray-700'
                        : healthy
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {healthy && <Leaf size={11} aria-hidden />}
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={56} />}
            title={recipes.length === 0 ? 'No recipes yet' : 'No results'}
            description={
              recipes.length === 0
                ? 'Add your first recipe to start building your collection.'
                : 'Try a different search or filter.'
            }
            action={
              recipes.length === 0 && mode === 'full' ? (
                <button
                  onClick={() => { setEditingRecipe(null); setShowAdd(true); }}
                  className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  Add your first recipe
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                inPlan={planIds.has(recipe.id)}
                onAddToPlan={mode === 'picker' ? () => handleAddToPlan(recipe.id) : undefined}
                addLabel={pickLabel}
                onClick={() => setSelectedRecipe(recipe)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recipe Detail */}
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          open={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={mode === 'full' ? () => { setEditingRecipe(selectedRecipe); setSelectedRecipe(null); setShowAdd(true); } : undefined}
          onDelete={mode === 'full' ? () => handleDeleteRecipe(selectedRecipe.id) : undefined}
          inPlan={planIds.has(selectedRecipe.id)}
          onAddToPlan={mode === 'picker' ? () => handleAddToPlan(selectedRecipe.id) : undefined}
          addLabel={pickLabel}
        />
      )}

      {/* Add / Edit Form */}
      {mode === 'full' && (
        <RecipeForm
          open={showAdd}
          onClose={() => { setShowAdd(false); setEditingRecipe(undefined); }}
          onSave={handleSaveRecipe}
          initial={editingRecipe ?? undefined}
        />
      )}
    </div>
  );
}
