import { useState, useMemo } from 'react';
import { X, Check, Trash2, Plus, Download, Copy, Bell, ShoppingCart } from 'lucide-react';
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
// Inner panel — receives all derived state + handlers as props so it can be
// placed either inside a fixed overlay or directly inside a flex sidebar.
// ---------------------------------------------------------------------------
interface PanelProps {
  totalCount: number;
  aggregated: ReturnType<typeof aggregateShoppingList>;
  removedRecipeItems: Set<string>;
  manualItems: ShoppingItem[];
  copied: boolean;
  addingItem: boolean;
  newItem: string;
  newQty: string;
  newUnit: Unit;
  showClose: boolean;
  onClose: () => void;
  onToggleRecipeItem: (key: string) => void;
  onToggleManual: (id: string) => void;
  onRemoveManual: (id: string) => void;
  onDownloadCSV: () => void;
  onCopyChecklist: () => void;
  onAppleReminders: () => void;
  onAddItem: () => void;
  setAddingItem: (v: boolean) => void;
  setNewItem: (v: string) => void;
  setNewQty: (v: string) => void;
  setNewUnit: (v: Unit) => void;
}

function ShoppingPanel({
  totalCount, aggregated, removedRecipeItems, manualItems,
  copied, addingItem, newItem, newQty, newUnit,
  showClose, onClose,
  onToggleRecipeItem, onToggleManual, onRemoveManual,
  onDownloadCSV, onCopyChecklist, onAppleReminders,
  onAddItem, setAddingItem, setNewItem, setNewQty, setNewUnit,
}: PanelProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-brand-600" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">Shopping List</h2>
            <p className="text-xs text-gray-400">{totalCount} item{totalCount !== 1 ? 's' : ''}</p>
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
        <button onClick={onDownloadCSV} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[40px]">
          <Download size={13} /> CSV
        </button>
        <button onClick={onCopyChecklist} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors min-h-[40px] ${copied ? 'bg-brand-50 border-brand-300 text-brand-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={onAppleReminders} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[40px]">
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
          <ul className="divide-y divide-gray-50">
            {/* Recipe-sourced items */}
            {aggregated.map(item => {
              const removed = removedRecipeItems.has(item.key);
              return (
                <li key={item.key} className={`flex items-center px-4 py-2.5 transition-colors ${removed ? 'opacity-40' : ''}`}>
                  <button
                    onClick={() => onToggleRecipeItem(item.key)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mr-3 ${removed ? 'border-gray-300 bg-white' : 'border-brand-500 bg-brand-500'}`}
                    aria-label={removed ? 'Restore item' : 'Mark as got it'}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    {!removed && <Check size={10} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm min-w-0 truncate ${removed ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums ml-2">
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>
                </li>
              );
            })}

            {/* Manual items */}
            {manualItems.map(item => (
              <li key={item.id} className={`flex items-center px-4 py-2.5 ${item.checked ? 'opacity-50' : ''}`}>
                <button
                  onClick={() => onToggleManual(item.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mr-3 ${item.checked ? 'border-brand-500 bg-brand-500' : 'border-gray-300 bg-white'}`}
                  aria-label={item.checked ? 'Uncheck' : 'Check'}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {item.checked && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm min-w-0 truncate ${item.checked ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                  {item.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums ml-2">
                  {formatQuantity(item.quantity)} {item.unit}
                </span>
                <button
                  onClick={() => onRemoveManual(item.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1"
                  aria-label="Delete item"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
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
                if (e.key === 'Enter') onAddItem();
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
              <button onClick={onAddItem} className="px-3 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
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
// Public component
// ---------------------------------------------------------------------------
export function ShoppingList({ open, onClose, alwaysVisible = false }: ShoppingListProps) {
  const { currentPlan, recipes, shoppingItems, removedRecipeItems } = useAppState();
  const dispatch = useAppDispatch();

  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState<Unit>('pieces');
  const [copied, setCopied] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const aggregated = useMemo(
    () => aggregateShoppingList(currentPlan, recipes),
    [currentPlan, recipes]
  );

  const visibleAggregated = aggregated.filter(item => !removedRecipeItems.has(item.key));
  const manualItems = shoppingItems.filter(i => i.isManual && !i.removed);
  const totalCount = visibleAggregated.length + manualItems.length;

  const panelProps: Omit<PanelProps, 'showClose' | 'onClose'> = {
    totalCount,
    aggregated,
    removedRecipeItems,
    manualItems,
    copied,
    addingItem,
    newItem,
    newQty,
    newUnit,
    onToggleRecipeItem: (key) => dispatch({ type: 'TOGGLE_REMOVED_RECIPE_ITEM', key }),
    onToggleManual: (id) => dispatch({ type: 'TOGGLE_SHOPPING_ITEM', id }),
    onRemoveManual: (id) => dispatch({ type: 'REMOVE_SHOPPING_ITEM', id }),
    onDownloadCSV: () => downloadCSV(shoppingListToCSV(visibleAggregated, manualItems), 'shopping-list.csv'),
    onCopyChecklist: () => {
      navigator.clipboard.writeText(shoppingListToChecklist(visibleAggregated, manualItems)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    onAppleReminders: () => {
      const text = shoppingListToChecklist(visibleAggregated, manualItems);
      const link = document.createElement('a');
      link.href = `x-apple-reminderkit://reminderslist/?reminderTitle=${encodeURIComponent('Shopping List')}&reminderNotes=${encodeURIComponent(text)}`;
      link.click();
      navigator.clipboard.writeText(text);
    },
    onAddItem: () => {
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
    },
    setAddingItem,
    setNewItem,
    setNewQty,
    setNewUnit,
  };

  // Desktop sidebar — renders inline, no overlay
  if (alwaysVisible) {
    return (
      <div className="flex flex-col h-full bg-white">
        <ShoppingPanel {...panelProps} showClose={false} onClose={onClose} />
      </div>
    );
  }

  // Mobile/tablet overlay — only rendered when open
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      {/* Slide-over panel: full-screen on mobile, right-anchored drawer on tablet */}
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 z-50 bg-white flex flex-col shadow-2xl">
        <ShoppingPanel {...panelProps} showClose onClose={onClose} />
      </div>
    </>
  );
}
