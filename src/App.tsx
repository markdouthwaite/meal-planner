import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { RecipesPage } from './components/recipes/RecipesPage';
import { PlanPage } from './components/plan/PlanPage';
import { ShoppingList } from './components/shopping/ShoppingList';
import { useIsMobile } from './utils/useIsMobile';

function AppShell() {
  const [shoppingOpen, setShoppingOpen] = useState(false);
  // On large screens the shopping list is always visible as a side panel
  const isDesktop = !useIsMobile(1024);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar
        onOpenShopping={() => setShoppingOpen(true)}
        shoppingVisible={isDesktop}
      />

      {/* Body: main content + optional desktop side panel */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden pb-14 sm:pb-0">
          <div className="h-full overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/recipes" replace />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/plan" element={<PlanPage />} />
            </Routes>
          </div>
        </main>

        {/* Desktop persistent shopping panel */}
        {isDesktop && (
          <aside className="w-80 xl:w-96 border-l border-gray-100 bg-white flex-shrink-0 overflow-hidden">
            <ShoppingList open={true} onClose={() => {}} alwaysVisible />
          </aside>
        )}
      </div>

      <BottomNav onOpenShopping={() => setShoppingOpen(true)} />

      {/* Mobile/tablet slide-over */}
      {!isDesktop && (
        <ShoppingList open={shoppingOpen} onClose={() => setShoppingOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppProvider>
  );
}
