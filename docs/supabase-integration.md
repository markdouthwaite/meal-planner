# Supabase Integration Plan

This document describes how the Family Meal Planner moves from a fully
client-side, `localStorage`-backed app to a Supabase-backed one with real
accounts and shared, multi-device data.

**Decisions taken** (locked in for this work):

- **Auth**: real Supabase Auth accounts (replacing the shared password gate).
- **Data scope**: per-household *workspaces* — each household has isolated data,
  and users join a household and share its recipes, plans, and shopping list.
- **This first step**: schema + plan only. The app is **not** rewired yet; you
  run the SQL, then we wire the client in the next pass.

---

## Step 1 — Apply the schema (do this now)

The schema lives at `supabase/migrations/0001_init.sql`. It creates:

| Table | Purpose |
|-------|---------|
| `households` | Workspaces. A user creates one and becomes its owner. |
| `household_members` | Links `auth.users` to households (owner/member). |
| `recipes` | Recipes, scoped to a household. Ingredients stored as `jsonb`. |
| `meal_plans` / `plan_slots` | The weekly plan; one slot per (date, meal). |
| `shopping_items` | Manual + persisted shopping list rows. |
| `removed_recipe_items` / `recipe_item_overrides` | Per-household edits layered on the recipe-derived shopping list. |

It also installs **Row Level Security** on every table so a user can only ever
read/write data for households they belong to, plus a trigger that makes the
creator of a household its owner automatically.

**Apply it one of two ways:**

- **Dashboard (quickest):** Supabase project → SQL Editor → paste the contents
  of `0001_init.sql` → Run.
- **CLI (recommended for ongoing work):**
  ```bash
  npm i -g supabase
  supabase login
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```

After running it, check **Table Editor** — you should see the eight tables, and
**Authentication → Policies** should show RLS enabled with policies on each.

## Step 2 — Configure Auth in the Supabase dashboard

1. **Authentication → Providers**: enable **Email**. For a low-friction family
   app, turn on **Magic Link** (passwordless) and/or email+password.
2. **Authentication → URL Configuration**: add your site URLs to
   *Redirect URLs* — `http://localhost:5173` for local dev and your Vercel
   production URL.
3. (Optional) Disable "Confirm email" for faster onboarding during development;
   re-enable for production.

## Step 3 — Wire up local env

Copy the example file and fill in the two values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

`.env.local` is already git-ignored (`*.local`). For production, set the same
two variables in **Vercel → Project Settings → Environment Variables** and
redeploy.

---

## Step 4 onward — Client wiring (next pass, after the SQL is live)

This is the plan for the code changes; nothing here is implemented yet.

### 4a. Supabase client + auth

- Add `src/lib/supabase.ts` exporting a typed `createClient(...)` singleton.
- Replace the password gate (`src/auth/useAuth.ts`, `AuthGate`, `LockScreen`)
  with Supabase Auth: `supabase.auth.getSession()`, `onAuthStateChange`, and a
  real sign-in screen (magic link or email+password). The existing `AuthGate` /
  `useAuthApi` seam is a clean place to swap the implementation — components
  consuming `useAuthApi` mostly won't change.

### 4b. Household bootstrap

- After login, look up the user's households via `household_members`.
- If none, show a "Create your household" step (insert into `households`; the
  trigger adds the owner row). If exactly one, select it. Store the active
  `household_id` in context.
- Add a simple invite flow later (owner inserts a `household_members` row, or a
  proper invite-token table — noted as future work below).

### 4c. Data layer — replace the reducer's persistence

`src/store/AppContext.tsx` is the single integration point by design. Plan:

- Keep the `useReducer` shape and the `Action` types as the app's internal API
  so components don't change.
- Replace the two `localStorage` effects:
  - **Load**: on mount (and household change), fetch `recipes`, the active
    `meal_plans` row + its `plan_slots`, `shopping_items`,
    `removed_recipe_items`, `recipe_item_overrides`, and `LOAD_STATE`.
  - **Persist**: instead of serialising the whole state to localStorage, have
    each mutating action also issue the matching Supabase write
    (insert/update/delete/upsert). Recommended approach: a thin async data
    module (e.g. `src/store/api.ts`) with one function per action, called from
    a wrapped dispatch — this keeps the reducer pure.
- Use Supabase **Realtime** subscriptions on the household-scoped tables so a
  change on one device shows up on another (nice for a shared family list).

### 4d. ID strategy

The DB uses `uuid` primary keys with `gen_random_uuid()` defaults, whereas the
client's `generateId()` returns random base36 strings and seed recipes use
`seed:<slug>` ids. When wiring:

- Either let the DB generate ids (omit `id` on insert, read it back), or
- Switch `generateId()` to `crypto.randomUUID()` and send client-generated
  uuids.

The `seed:<slug>` scheme and `seenSeedIds` go away (see seeding below).

### 4e. Seeding starter recipes

`src/utils/seedData.ts` (~10 starter recipes) currently seeds each browser.
With shared data, seed **once per household** instead:

- On household creation, insert the starter recipes for that `household_id`
  (either from a client call that maps `SEED_RECIPES`, or a SQL/Edge function).
- Drop the per-client `seenSeedIds` reconciliation logic in `AppProvider`.

### 4f. One-time localStorage migration

So existing users don't lose their current data, on first authenticated load:

- If `localStorage['meal-planner-state']` exists and the household has no
  recipes yet, offer to import it: map the stored recipes/plan/shopping list
  into the new tables for the active household, then mark it migrated.

---

## Suggested PR breakdown

1. **This PR** — schema migration + this plan (no app behaviour change).
2. Supabase client + Auth swap + household bootstrap.
3. Data layer: recipes read/write through Supabase.
4. Meal plan + shopping list read/write + Realtime.
5. localStorage → Supabase one-time migration + seed-on-create.

## Future work / things to tighten

- **Invites**: the current `household_members` insert policy lets any existing
  member add rows for their household. For real invites, add an
  `invitations` table with tokens and an Edge Function to accept them.
- **Owner-only actions**: deleting a household / removing other members is
  currently allowed for any member. Tighten to `role = 'owner'` if desired.
- **Recipe ratings**: the README's 5-star rating TODO maps cleanly to a
  nullable `rating` column on `recipes` (or a per-user `recipe_ratings` table).
