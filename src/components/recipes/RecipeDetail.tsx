import { useState, useEffect } from 'react';
import { Edit2, Trash2, ExternalLink, Users, ArrowLeft } from 'lucide-react';
import type { Recipe } from '../../types';
import { MealTypeBadge } from '../ui/MealTypeBadge';
import { RecipeImage } from '../ui/RecipeImage';
import { Modal } from '../ui/Modal';
import { formatQuantity } from '../../utils/helpers';
import { useIsMobile } from '../../utils/useIsMobile';

interface RecipeDetailProps {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  inPlan: boolean;
  onAddToPlan: () => void;
}

export function RecipeDetail({
  recipe, open, onClose, onEdit, onDelete, inPlan, onAddToPlan,
}: RecipeDetailProps) {
  const [tab, setTab] = useState<'ingredients' | 'method'>('ingredients');
  const isMobile = useIsMobile();

  // Reset to ingredients tab whenever the recipe changes
  useEffect(() => { setTab('ingredients'); }, [recipe.id]);

  function handleDelete() {
    if (window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) {
      onDelete?.();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} fullScreen={isMobile} showCloseButton={false}>
      {/* Mobile: sticky back-button header above hero */}
      {isMobile && (
        <div className="sticky top-0 z-10 flex items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-brand-600 text-sm font-semibold min-h-[44px]"
            aria-label="Back"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      )}

      {/* Hero image */}
      <RecipeImage
        src={recipe.image}
        alt={recipe.title}
        className="w-full h-52 sm:h-64"
      />

      <div className="p-5">
        {/* Meal type badges */}
        {recipe.meal_type.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {recipe.meal_type.map(t => <MealTypeBadge key={t} type={t} />)}
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-1">{recipe.title}</h2>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1"><Users size={14} /> {recipe.servings} servings</span>
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-600 hover:underline"
            >
              <ExternalLink size={14} /> Source
            </a>
          )}
        </div>

        {/* All tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {recipe.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 mb-5">
          {(['ingredients', 'method'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ingredients' ? 'Ingredients' : 'Method'}
            </button>
          ))}
        </div>

        {/* Ingredients tab */}
        {tab === 'ingredients' && (
          <div className="space-y-5">
            {recipe.description && (
              <p className="text-sm text-gray-600 italic leading-relaxed">{recipe.description}</p>
            )}
            <ul className="space-y-2">
              {recipe.ingredients.map(ing => (
                <li key={ing.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-800">{ing.name}</span>
                  <span className="text-sm font-medium text-gray-600">
                    {formatQuantity(ing.quantity)} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
            {recipe.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-amber-900 leading-relaxed">{recipe.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Method tab */}
        {tab === 'method' && (
          <div>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No method steps added yet.</p>
            ) : (
              <ol className="space-y-4">
                {recipe.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-8 pb-safe">
          {onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors min-h-[44px]"
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <Edit2 size={15} /> Edit
            </button>
          )}
          <button
            onClick={() => { if (!inPlan) { onAddToPlan(); onClose(); } }}
            disabled={inPlan}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
              inPlan
                ? 'bg-brand-50 text-brand-600 cursor-default'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {inPlan ? 'Already in Plan' : 'Add to Plan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
