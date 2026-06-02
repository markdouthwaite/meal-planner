# Family Meal Planner

A mobile-first web app for planning weekly meals, managing a recipe collection, and generating aggregated shopping lists.

## Stack

- **React + Vite + TypeScript**
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Supabase** (Postgres + Auth) for persistence and accounts

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

All state is managed in `src/store/AppContext.tsx` using React Context + `useReducer`. On sign-in the store loads the household's data from Supabase, and each reducer action is mirrored to the database (`src/store/db.ts`). Components only ever touch `useAppState` / `useAppDispatch`, so the UI is unaware of the backend.

```
src/
  components/
    layout/       # TopBar, BottomNav
    recipes/      # RecipeCard, RecipeDetail, RecipeForm, RecipesPage
    plan/         # PlanPage, PlanMealCard, MealTypeTracker
    shopping/     # ShoppingList
    ui/           # Modal, EmptyState, MealTypeBadge, RecipeImage
  auth/           # Supabase email+password sign-in (single permitted user)
  lib/            # supabase client
  store/          # AppContext (global state) + db (Supabase data layer)
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

