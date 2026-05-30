import { useState, useMemo, useRef } from 'react';
import {
  X, Check, Trash2, Plus, Download, Copy, Bell, ShoppingCart, RotateCcw,
} from 'lucide-react';
import { useAppState, useAppDispatch } from '../../store/AppContext';
import {
  aggregateShoppingList,
  shoppingListToCSV,
  shoppingListToChecklist,
  downloadCSV,
} from '../../utils/shopping';
import { generateId, formatQuantity, UNITS } from '../../utils/helpers';
import type { ShoppingItem, Unit } from '../../types';

interface ShoppingListProps {
  open: boolean;
  onClose: () => void;
  /** When true, renders inline (no fixed positioning / backdrop) — used for the desktop sidebar */
  alwaysVisible?: boolean;
}

// ---------------------------------------------------------------------------
// Inline editor for a quantity. Commits on Enter / blur, cancels on Escape.
// ---------------------------------------------------------------------------
interface QuantityEditorProps {
  value: number;
  unit: string;
  onCommit: (n: number) => void;
  onCancel: () => void;
}

function QuantityEditor({ value, unit, onCommit, onCancel }: QuantityEditorProps) {
  const [text, setText] = useState(() => formatQuantity(value));
  const committedRef = useRef(false);

  function tryCommit() {
    if (committedRef.current) return;
    committedRef.current = true;
    const n = parseFloat(text);
    if (Number.isFinite(n) && n >= 0) onCommit(n);
    else onCancel();
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={tryCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); tryCommit(); }
          if (e.key === 'Escape') {
            e.preventDefault();
            committedRef.current = true;
            onCancel();
          }
        }}
        className="w-16 text-xs text-right rounded-md border border-brand-300 px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
      />
      <span className="text-xs text-gray-400">{unit}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// One row of the shopping list. Used for both recipe-aggregated and manual items.
// ---------------------------------------------------------------------------
interface RowProps {
  name: string;
  quantity: number;
  unit: string;
  notNeeded: boolean;
  overridden?: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCommitQuantity: (n: number) => void;
  onCancelEdit: () => void;
  onReset?: () => void;
  onDelete?: () => void;
}

function Row({
  name, quantity, unit, notNeeded, overridden, isEditing,
  onToggle, onStartEdit, onCommitQuantity, onCancelEdit, onReset, onDelete,
}: RowProps) {
  return (
    <li className={`flex items-center px-4 py-2.5 transition-colors ${notNeeded ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mr-3 ${
          notNeeded
            ? 'border-brand-500 bg-brand-500'
            : 'border-gray-300 bg-white'
        }`}
        aria-label={notNeeded ? 'Move back to active' : 'Move to not needed'}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        {notNeeded && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>

      <span className={`flex-1 text-sm min-w-0 truncate ${notNeeded ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
        {name}
      </span>

      {isEditing ? (
        <QuantityEditor
          value={quantity}
          unit={unit}
          onCommit={onCommitQuantity}
          onCancel={onCancelEdit}
        />
      ) : (
        <button
          onClick={onStartEdit}
          className={`flex-shrink-0 tabular-nums text-xs ml-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors ${
            overridden ? 'text-brand-600 font-semibold' : 'text-gray-400'
          }`}
          aria-label={`Edit quantity (currently ${formatQuantity(quantity)} ${unit})`}
        >
          {formatQuantity(quantity)} {unit}
        </button>
      )}

      {overridden && !isEditing && onReset && (
        <button
          onClick={onReset}
          className="flex-shrink-0 ml-0.5 p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors"
          aria-label="Reset to original quantity"
          title="Reset to original"
        >
          <RotateCcw size={13} />
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1"
          aria-label="Delete item"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main panel. Owns its own UI state; reads/writes app state via context.
// ---------------------------------------------------------------------------
interface PanelProps {
  showClose: boolean;
  onClose: () => void;
}

function ShoppingPanel({ showClose, onClose }: PanelProps) {
  const { currentPlan, recipes, shoppingItems, removedRecipeItems, recipeItemQuantityOverrides } = useAppState();
  const dispatch = useAppDispatch();

  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState<Unit>('pieces');
  const [copied, setCopied] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const aggregated = useMemo(
    () => aggregateShoppingList(currentPlan, recipes, recipeItemQuantityOverrides),
    [currentPlan, recipes, recipeItemQuantityOverrides],
  );

  const manualItems = shoppingItems.filter(i => i.isManual && !i.removed);

  // Partition into active vs not-needed.
  const activeRecipeItems = aggregated.filter(i => !removedRecipeItems.has(i.key));
  const notNeededRecipeItems = aggregated.filter(i => removedRecipeItems.has(i.key));
  const activeManualItems = manualItems.filter(i => !i.checked);
  const notNeededManualItems = manualItems.filter(i => i.checked);

  const activeCount = activeRecipeItems.length + activeManualItems.length;
  const notNeededCount = notNeededRecipeItems.length + notNeededManualItems.length;
  const totalCount = activeCount + notNeededCount;

  // Items used for exports / count badges should reflect what the user actually intends to buy:
  // active recipe items + manual items (existing behaviour). Overrides are baked into `quantity`.
  const exportItems = activeRecipeItems;
  const exportManual = manualItems;

  function handleAddItem() {
    if (!newItem.trim()) return;
    const item: ShoppingItem = {
      id: generateId(),
      name: newItem.trim(),
      quantity: Number(newQty) || 1,
      unit: newUnit,
      isManual: true,
      checked: false,
      removed: false,
    };
    dispatch({ type: 'ADD_SHOPPING_ITEM', item });
    setNewItem('');
    setNewQty('1');
    setAddingItem(false);
  }

  function handleClearList() {
    if (totalCount === 0) return;
    const ok = window.confirm(
      'Clear the shopping list?\n\nEverything currently on the list moves to "Not needed", manual items are deleted, and quantity changes are reset. Your meal plan is untouched.',
    );
    if (ok) {
      dispatch({
        type: 'CLEAR_SHOPPING_LIST',
        recipeItemKeys: aggregated.map(i => i.key),
      });
    }
  }

  // Derive the effective editing id — drops stale ids when the target disappears
  // (e.g. plan changes, item deleted) without needing a setState-in-effect.
  const stillExists =
    editingId !== null &&
    (aggregated.some(i => i.key === editingId) ||
      manualItems.some(i => i.id === editingId));
  const effectiveEditingId = stillExists ? editingId : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart size={18} className="text-brand-600 flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">Shopping List</h2>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span>{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
              {totalCount > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={handleClearList}
                    className="text-gray-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline"
                  >
                    Clear list
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close shopping list"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => downloadCSV(shoppingListToCSV(exportItems, exportManual), 'shopping-list.csv')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[40px]"
        >
          <Download size={13} /> CSV
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(shoppingListToChecklist(exportItems, exportManual)).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors min-h-[40px] ${copied ? 'bg-brand-50 border-brand-300 text-brand-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => {
            const text = shoppingListToChecklist(exportItems, exportManual);
            const link = document.createElement('a');
            link.href = `x-apple-reminderkit://reminderslist/?reminderTitle=${encodeURIComponent('Shopping List')}&reminderNotes=${encodeURIComponent(text)}`;
            link.click();
            navigator.clipboard.writeText(text);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[40px]"
        >
          <Bell size={13} /> Reminders
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <ShoppingCart size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">Your list is empty</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Add recipes to your plan and ingredients will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Active section */}
            {activeCount > 0 && (
              <ul className="divide-y divide-gray-50">
                {activeRecipeItems.map(item => (
                  <Row
                    key={item.key}
                    name={item.name}
                    quantity={item.quantity}
                    unit={item.unit}
                    notNeeded={false}
                    overridden={item.overridden}
                    isEditing={effectiveEditingId === item.key}
                    onToggle={() => dispatch({ type: 'TOGGLE_REMOVED_RECIPE_ITEM', key: item.key })}
                    onStartEdit={() => setEditingId(item.key)}
                    onCommitQuantity={(n) => {
                      dispatch({ type: 'SET_RECIPE_ITEM_QUANTITY', key: item.key, quantity: n });
                      setEditingId(null);
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onReset={() => dispatch({ type: 'RESET_RECIPE_ITEM_QUANTITY', key: item.key })}
                  />
                ))}
                {activeManualItems.map(item => (
                  <Row
                    key={item.id}
                    name={item.name}
                    quantity={item.quantity}
                    unit={item.unit}
                    notNeeded={false}
                    isEditing={effectiveEditingId === item.id}
                    onToggle={() => dispatch({ type: 'TOGGLE_SHOPPING_ITEM', id: item.id })}
                    onStartEdit={() => setEditingId(item.id)}
                    onCommitQuantity={(n) => {
                      dispatch({ type: 'SET_MANUAL_ITEM_QUANTITY', id: item.id, quantity: n });
                      setEditingId(null);
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => dispatch({ type: 'REMOVE_SHOPPING_ITEM', id: item.id })}
                  />
                ))}
              </ul>
            )}

            {/* Not needed section */}
            {notNeededCount > 0 && (
              <>
                <div className="px-5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-t border-gray-100 mt-1">
                  Not needed · {notNeededCount}
                </div>
                <ul className="divide-y divide-gray-50">
                  {notNeededRecipeItems.map(item => (
                    <Row
                      key={item.key}
                      name={item.name}
                      quantity={item.quantity}
                      unit={item.unit}
                      notNeeded
                      overridden={item.overridden}
                      isEditing={effectiveEditingId === item.key}
                      onToggle={() => dispatch({ type: 'TOGGLE_REMOVED_RECIPE_ITEM', key: item.key })}
                      onStartEdit={() => setEditingId(item.key)}
                      onCommitQuantity={(n) => {
                        dispatch({ type: 'SET_RECIPE_ITEM_QUANTITY', key: item.key, quantity: n });
                        setEditingId(null);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onReset={() => dispatch({ type: 'RESET_RECIPE_ITEM_QUANTITY', key: item.key })}
                    />
                  ))}
                  {notNeededManualItems.map(item => (
                    <Row
                      key={item.id}
                      name={item.name}
                      quantity={item.quantity}
                      unit={item.unit}
                      notNeeded
                      isEditing={effectiveEditingId === item.id}
                      onToggle={() => dispatch({ type: 'TOGGLE_SHOPPING_ITEM', id: item.id })}
                      onStartEdit={() => setEditingId(item.id)}
                      onCommitQuantity={(n) => {
                        dispatch({ type: 'SET_MANUAL_ITEM_QUANTITY', id: item.id, quantity: n });
                        setEditingId(null);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => dispatch({ type: 'REMOVE_SHOPPING_ITEM', id: item.id })}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* Add manual item footer */}
      <div className="border-t border-gray-100 px-4 py-3 pb-safe flex-shrink-0">
        {addingItem ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Item name"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') setAddingItem(false);
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={newQty}
                min={0}
                onChange={e => setNewQty(e.target.value)}
                className="w-20 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value as Unit)}
                className="flex-1 rounded-xl border border-gray-200 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={handleAddItem} className="px-3 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
                Add
              </button>
              <button onClick={() => setAddingItem(false)} className="px-2.5 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingItem(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors min-h-[48px]"
          >
            <Plus size={15} /> Add extra item
          </button>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component — wraps the panel in either an overlay or an inline sidebar.
// ---------------------------------------------------------------------------
export function ShoppingList({ open, onClose, alwaysVisible = false }: ShoppingListProps) {
  if (alwaysVisible) {
    return (
      <div className="flex flex-col h-full bg-white">
        <ShoppingPanel showClose={false} onClose={onClose} />
      </div>
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 z-50 bg-white flex flex-col shadow-2xl">
        <ShoppingPanel showClose onClose={onClose} />
      </div>
    </>
  );
}
