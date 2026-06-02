-- Family Meal Planner — initial schema
--
-- Model: Supabase Auth users belong to one or more *households* (workspaces).
-- All app data (recipes, meal plans, shopping list) is scoped to a household,
-- and Row Level Security ensures a user can only ever touch data for a
-- household they are a member of.
--
-- Apply this from the Supabase dashboard (SQL Editor) or via the Supabase CLI
-- (`supabase db push`). It is idempotent-ish for a fresh project; it is NOT a
-- destructive down-migration.

-- Needed for gen_random_uuid().
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- These map directly onto the TypeScript unions in src/types/index.ts.
-- `meal_type` and `unit` are intentionally NOT enums: meal_type is stored as a
-- text[] on recipes, and shopping item units can be free text for manual items
-- (`Unit | string` in the client). Keeping them as text avoids painful
-- `ALTER TYPE` migrations later.

create type slot_mode as enum ('cook', 'leftovers', 'skip');
create type plan_status as enum ('planning', 'active', 'archived');
create type member_role as enum ('owner', 'member');

-- ---------------------------------------------------------------------------
-- Households (workspaces) + membership
-- ---------------------------------------------------------------------------
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on household_members (user_id);

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
-- `ingredients` is jsonb to mirror the client's Ingredient[] shape exactly:
--   [{ "id": "...", "name": "...", "quantity": 0, "unit": "g" }, ...]
-- The app never queries *across* ingredients, so a relational
-- recipe_ingredients table would add joins for no current benefit. Revisit if
-- you ever want "which recipes use tomatoes?" style queries.
create table recipes (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  title       text not null,
  description text not null default '',
  image       text,
  ingredients jsonb not null default '[]'::jsonb,
  steps       text[] not null default '{}',
  meal_type   text[] not null default '{}',
  servings    integer not null default 1,
  notes       text not null default '',
  source_url  text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index recipes_household_idx on recipes (household_id);

-- ---------------------------------------------------------------------------
-- Meal plans + slots
-- ---------------------------------------------------------------------------
-- The client currently keeps a single "currentPlan" per household, but the
-- table supports many (e.g. archived weeks) via `status`.
create table meal_plans (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  status      plan_status not null default 'planning',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index meal_plans_household_idx on meal_plans (household_id);

create table plan_slots (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references meal_plans (id) on delete cascade,
  date             date not null,
  -- Phase 1 is dinner-only; keep as text + check so adding 'lunch' later is a
  -- one-line change rather than an enum migration.
  meal             text not null default 'dinner' check (meal in ('dinner', 'lunch', 'breakfast')),
  mode             slot_mode not null default 'cook',
  recipe_id        uuid references recipes (id) on delete set null,
  servings_override numeric,
  -- For mode = 'leftovers', the date of the cook-slot this re-uses.
  leftovers_of     date,
  notes            text,
  -- Mirrors the client's upsertSlot key (one slot per date+meal per plan).
  unique (plan_id, date, meal)
);

create index plan_slots_plan_idx on plan_slots (plan_id);
create index plan_slots_recipe_idx on plan_slots (recipe_id);

-- ---------------------------------------------------------------------------
-- Shopping list
-- ---------------------------------------------------------------------------
-- These rows are the *manual* additions plus any persisted recipe-derived
-- items. The aggregation of recipe ingredients itself stays a client-side
-- computation (src/utils/shopping.ts); the tables below persist the user's
-- edits on top of it.
create table shopping_items (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  name        text not null,
  quantity    numeric not null default 0,
  unit        text not null default '',
  is_manual   boolean not null default true,
  checked     boolean not null default false,
  removed     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index shopping_items_household_idx on shopping_items (household_id);

-- The client tracks two pieces of derived-list UI state keyed by a string
-- "item key" (see removedRecipeItems / recipeItemQuantityOverrides in
-- AppContext). Persist them per household so edits survive across devices.
create table removed_recipe_items (
  household_id uuid not null references households (id) on delete cascade,
  item_key     text not null,
  primary key (household_id, item_key)
);

create table recipe_item_overrides (
  household_id uuid not null references households (id) on delete cascade,
  item_key     text not null,
  quantity     numeric not null,
  primary key (household_id, item_key)
);

-- Note: `seenSeedIds` from the localStorage model is intentionally dropped.
-- With a shared DB, starter recipes are seeded once per household at creation
-- time (see docs/supabase-integration.md), so there is no per-client "have I
-- seen this seed?" bookkeeping.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Returns the household ids the current user belongs to. SECURITY DEFINER so
-- it bypasses RLS on household_members — this is what lets other tables'
-- policies reference membership without recursive policy evaluation.
create or replace function public.current_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- Auto-add the creator as the household owner. Runs as definer so the insert
-- into household_members isn't blocked by that table's RLS.
create or replace function public.handle_new_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_household_created
  after insert on households
  for each row execute function public.handle_new_household();

-- Keep updated_at fresh on recipes and meal_plans.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_touch_updated_at
  before update on recipes
  for each row execute function public.touch_updated_at();

create trigger meal_plans_touch_updated_at
  before update on meal_plans
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table households            enable row level security;
alter table household_members     enable row level security;
alter table recipes               enable row level security;
alter table meal_plans            enable row level security;
alter table plan_slots            enable row level security;
alter table shopping_items        enable row level security;
alter table removed_recipe_items  enable row level security;
alter table recipe_item_overrides enable row level security;

-- households: members can see and modify their household; any authenticated
-- user can create one (they become owner via the trigger).
create policy households_select on households
  for select to authenticated
  using (id in (select current_household_ids()));

create policy households_insert on households
  for insert to authenticated
  with check (created_by = auth.uid());

create policy households_update on households
  for update to authenticated
  using (id in (select current_household_ids()))
  with check (id in (select current_household_ids()));

create policy households_delete on households
  for delete to authenticated
  using (id in (select current_household_ids()));

-- household_members: you can see members of your households. Inserting other
-- members requires you already be in that household (an owner inviting). The
-- creator's own owner row is added by the trigger (definer), so it is exempt.
create policy household_members_select on household_members
  for select to authenticated
  using (household_id in (select current_household_ids()));

create policy household_members_insert on household_members
  for insert to authenticated
  with check (household_id in (select current_household_ids()));

create policy household_members_delete on household_members
  for delete to authenticated
  using (
    household_id in (select current_household_ids())
    or user_id = auth.uid()  -- always allowed to leave
  );

-- Generic household-scoped CRUD for the data tables.
create policy recipes_all on recipes
  for all to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));

create policy meal_plans_all on meal_plans
  for all to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));

-- plan_slots are scoped via their parent plan's household.
create policy plan_slots_all on plan_slots
  for all to authenticated
  using (
    exists (
      select 1 from meal_plans p
      where p.id = plan_slots.plan_id
        and p.household_id in (select current_household_ids())
    )
  )
  with check (
    exists (
      select 1 from meal_plans p
      where p.id = plan_slots.plan_id
        and p.household_id in (select current_household_ids())
    )
  );

create policy shopping_items_all on shopping_items
  for all to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));

create policy removed_recipe_items_all on removed_recipe_items
  for all to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));

create policy recipe_item_overrides_all on recipe_item_overrides
  for all to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));
