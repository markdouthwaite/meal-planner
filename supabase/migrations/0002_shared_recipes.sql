-- Shared & base recipes
--
-- Changes the recipe ownership model so recipes can be:
--   * base    — household_id IS NULL: global, seeded, visible to everyone,
--               and read-only (no household can edit/delete them).
--   * private — household_id = X, is_shared = false: visible/editable only by
--               household X.
--   * shared  — household_id = X, is_shared = true: visible to ALL households,
--               but still editable/deletable only by the owner (household X).
--
-- All of this is enforced by RLS below; the app needs no special-casing beyond
-- hiding edit/delete controls on recipes the current household doesn't own.

-- 1. Ownership becomes optional (NULL = global base recipe).
alter table recipes alter column household_id drop not null;

-- 2. Sharing flag for user-created recipes.
alter table recipes add column is_shared boolean not null default false;

-- Speeds up the "globally visible" half of the select policy.
create index recipes_shared_idx on recipes (is_shared) where is_shared;

-- 3. Replace the single household-scoped policy with read/write split.
drop policy if exists recipes_all on recipes;

-- Readable: base recipes (no owner), anything shared globally, or your own.
create policy recipes_select on recipes
  for select to authenticated
  using (
    household_id is null
    or is_shared
    or household_id in (select current_household_ids())
  );

-- Writable only for rows your household owns. `household_id in (...)` is false
-- for NULL (base) and for other households' rows, so those stay read-only.
create policy recipes_insert on recipes
  for insert to authenticated
  with check (household_id in (select current_household_ids()));

create policy recipes_update on recipes
  for update to authenticated
  using (household_id in (select current_household_ids()))
  with check (household_id in (select current_household_ids()));

create policy recipes_delete on recipes
  for delete to authenticated
  using (household_id in (select current_household_ids()));
