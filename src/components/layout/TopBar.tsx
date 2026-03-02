import { ShoppingCart } from 'lucide-react';
import { useAppState } from '../../store/AppContext';
import { useMemo } from 'react';
import { aggregateShoppingList } from '../../utils/shopping';
import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  onOpenShopping: () => void;
  /** When true (desktop), the cart icon is hidden since the panel is always visible */
  shoppingVisible?: boolean;
}

export function TopBar({ onOpenShopping, shoppingVisible = false }: TopBarProps) {
  const { currentPlan, recipes, shoppingItems, removedRecipeItems } = useAppState();
  const { pathname } = useLocation();

  const totalCount = useMemo(() => {
    const agg = aggregateShoppingList(currentPlan, recipes);
    const visibleAgg = agg.filter(i => !removedRecipeItems.has(i.key));
    const manualCount = shoppingItems.filter(i => i.isManual && !i.removed).length;
    return visibleAgg.length + manualCount;
  }, [currentPlan, recipes, shoppingItems, removedRecipeItems]);

  const navLinks = [
    { to: '/recipes', label: 'Recipes' },
    { to: '/plan', label: 'Plan' },
  ];

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-sm hidden sm:block leading-tight">
          Family<br />
          <span className="text-brand-600">Meal Planner</span>
        </span>
      </div>

      {/* Centred nav (tablet+) */}
      <nav className="hidden sm:flex items-center gap-1">
        {navLinks.map(({ to, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side: shopping cart (hidden on desktop when panel is always visible) */}
      <div className="min-w-[140px] flex justify-end">
        {!shoppingVisible && (
          <button
            onClick={onOpenShopping}
            className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open shopping list"
          >
            <ShoppingCart size={22} />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {totalCount}
              </span>
            )}
          </button>
        )}
        {shoppingVisible && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShoppingCart size={16} />
            <span className="font-medium">{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </header>
  );
}
