import { BookOpen, CalendarDays, ShoppingCart } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppState } from '../../store/AppContext';
import { aggregateShoppingList } from '../../utils/shopping';

interface BottomNavProps {
  onOpenShopping: () => void;
}

export function BottomNav({ onOpenShopping }: BottomNavProps) {
  const { pathname } = useLocation();
  const { currentPlan, recipes, shoppingItems, removedRecipeItems } = useAppState();

  const shoppingCount = useMemo(() => {
    const agg = aggregateShoppingList(currentPlan, recipes);
    const visible = agg.filter(i => !removedRecipeItems.has(i.key));
    const manual = shoppingItems.filter(i => i.isManual && !i.removed);
    return visible.length + manual.length;
  }, [currentPlan, recipes, shoppingItems, removedRecipeItems]);

  const navTabs = [
    { to: '/recipes', label: 'Recipes', icon: BookOpen },
    { to: '/plan',    label: 'Plan',    icon: CalendarDays },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="flex">
        {navTabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (pathname === '/' && to === '/recipes');
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
                active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs mt-0.5 font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Shopping tab */}
        <button
          onClick={onOpenShopping}
          className="flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors text-gray-400 hover:text-gray-600 relative"
          aria-label="Open shopping list"
        >
          <div className="relative">
            <ShoppingCart size={22} strokeWidth={1.8} />
            {shoppingCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {shoppingCount > 99 ? '99+' : shoppingCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 font-medium">Shopping</span>
        </button>
      </div>
    </nav>
  );
}
