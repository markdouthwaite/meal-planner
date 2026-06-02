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

The app is being connected to Supabase for real accounts and shared,
multi-device data (per-household workspaces). The database schema lives in
`supabase/migrations/0001_init.sql`, and the step-by-step rollout — applying the
schema, configuring Auth, env vars, and the phased client wiring — is documented
in [`docs/supabase-integration.md`](docs/supabase-integration.md).

Quick start: copy `.env.example` to `.env.local` and fill in your Supabase
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.

## Future TODOs

- 5-star recipe rating mechanism — let users rate recipes (1–5 stars) so the auto-generate algorithm can prefer higher-rated meals and surface low-rated ones for review or deletion. Ratings stored per recipe (or per user once Supabase is wired) and exposed in the recipe card, detail view, and as an optional sort in the Recipes tab.

