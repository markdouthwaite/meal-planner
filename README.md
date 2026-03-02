# Family Meal Planner

A mobile-first web app for planning weekly meals, managing a recipe collection, and generating aggregated shopping lists.

## Stack

- **React + Vite + TypeScript**
- **Tailwind CSS** for styling
- **React Router** for navigation
- **localStorage** for persistence (Supabase-ready)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

## Architecture

All state is managed in `src/store/AppContext.tsx` using React Context + `useReducer`, persisted to `localStorage`. The app is structured to drop in Supabase as a backend by replacing the local dispatch calls with Supabase queries.

```
src/
  components/
    layout/       # TopBar, BottomNav
    recipes/      # RecipeCard, RecipeDetail, RecipeForm, RecipesPage
    plan/         # PlanPage, PlanMealCard, MealTypeTracker
    shopping/     # ShoppingList
    ui/           # Modal, EmptyState, MealTypeBadge, RecipeImage
  store/          # AppContext (global state)
  types/          # TypeScript types
  utils/          # helpers, shopping aggregation, seed data, useIsMobile
```

## Supabase Integration

Copy `.env.example` to `.env.local` and fill in your Supabase credentials to connect a real backend.
