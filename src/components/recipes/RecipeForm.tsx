import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { Recipe, Ingredient, MealType, Unit } from '../../types';
import { generateId, UNITS } from '../../utils/helpers';
import { Modal } from '../ui/Modal';
import { useIsMobile } from '../../utils/useIsMobile';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'baby'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', baby: 'Baby',
};

interface RecipeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  initial?: Recipe;
}

function emptyIngredient(): Ingredient {
  return { id: generateId(), name: '', quantity: 1, unit: 'g' };
}

export function RecipeForm({ open, onClose, onSave, initial }: RecipeFormProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [servings, setServings] = useState(initial?.servings ?? 4);
  const [mealTypes, setMealTypes] = useState<MealType[]>(initial?.meal_type ?? []);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()]
  );
  const [steps, setSteps] = useState<string[]>(
    initial?.steps?.length ? initial.steps : ['']
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? '');
  const [tags, setTags] = useState(initial?.tags?.join(', ') ?? '');
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form when the recipe being edited changes
  useEffect(() => {
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setServings(initial?.servings ?? 4);
    setMealTypes(initial?.meal_type ?? []);
    setIngredients(initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()]);
    setSteps(initial?.steps?.length ? initial.steps : ['']);
    setNotes(initial?.notes ?? '');
    setSourceUrl(initial?.source_url ?? '');
    setTags(initial?.tags?.join(', ') ?? '');
    setImage(initial?.image);
    setErrors({});
  }, [initial, open]);

  function toggleMealType(type: MealType) {
    setMealTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function handleImageFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setErrors(e => ({ ...e, image: 'Image must be under 5MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = e => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }

  // Ingredient helpers
  function updateIngredient(id: string, field: keyof Ingredient, value: string | number) {
    setIngredients(prev =>
      prev.map(i => (i.id === id ? { ...i, [field]: value } : i))
    );
  }
  function addIngredient() {
    setIngredients(prev => [...prev, emptyIngredient()]);
  }
  function removeIngredient(id: string) {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }

  // Step helpers
  function updateStep(idx: number, value: string) {
    setSteps(prev => prev.map((s, i) => (i === idx ? value : s)));
  }
  function addStep() {
    setSteps(prev => [...prev, '']);
  }
  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (servings < 1) errs.servings = 'Servings must be at least 1';
    const filledIngredients = ingredients.filter(i => i.name.trim());
    if (filledIngredients.length === 0) errs.ingredients = 'At least one ingredient is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: initial?.id ?? generateId(),
      title: title.trim(),
      description: description.trim(),
      image,
      ingredients: ingredients.filter(i => i.name.trim()),
      steps: steps.filter(s => s.trim()),
      meal_type: mealTypes,
      servings,
      notes: notes.trim(),
      source_url: sourceUrl.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: initial?.created_at ?? now,
      updated_at: now,
    };
    onSave(recipe);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Recipe' : 'Add Recipe'}
      fullScreen={isMobile}
    >
      <div className="p-5 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipe Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Spaghetti Bolognese"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="A brief description of the dish (1–2 sentences)"
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {image ? (
              <div className="relative">
                <img src={image} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={e => { e.stopPropagation(); setImage(undefined); }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="py-4">
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Drag & drop or tap to upload</p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 5MB</p>
              </div>
            )}
          </div>
          {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />
        </div>

        {/* Meal Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleMealType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  mealTypes.includes(type)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
                }`}
              >
                {MEAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Servings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Servings <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={servings}
            min={1}
            onChange={e => setServings(Number(e.target.value))}
            className="w-24 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.servings && <p className="text-xs text-red-500 mt-1">{errors.servings}</p>}
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingredients <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={ing.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ing.name}
                  onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                  placeholder={`Ingredient ${idx + 1}`}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={ing.quantity || ''}
                  min={0}
                  onChange={e => updateIngredient(ing.id, 'quantity', Number(e.target.value))}
                  placeholder="Qty"
                  className="w-20 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <select
                  value={ing.unit}
                  onChange={e => updateIngredient(ing.id, 'unit', e.target.value as Unit)}
                  className="rounded-xl border border-gray-200 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button
                  onClick={() => removeIngredient(ing.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove ingredient"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {errors.ingredients && <p className="text-xs text-red-500 mt-1">{errors.ingredients}</p>}
          <button
            onClick={addIngredient}
            className="mt-2 flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            <Plus size={16} /> Add ingredient
          </button>
        </div>

        {/* Method Steps */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Method Steps</label>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="mt-2.5 flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <textarea
                  value={step}
                  onChange={e => updateStep(idx, e.target.value)}
                  placeholder={`Step ${idx + 1}`}
                  rows={2}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <button
                  onClick={() => removeStep(idx)}
                  className="mt-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove step"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            className="mt-2 flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            <Plus size={16} /> Add step
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Tips, variations, serving suggestions…"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="quick, vegetarian, batch-cook (comma separated)"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-safe">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            {initial ? 'Save Changes' : 'Add Recipe'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
