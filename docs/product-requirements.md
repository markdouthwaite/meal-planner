# Product Requirements Document
## Family Meal Planner

| | |
|---|---|
| **Document** | Product Requirements Document |
| **Product** | Douthwaite-Green Family Meal Planner |
| **Author** | Mark Sherwood |
| **Version** | 1.2 |
| **Date** | March 2026 |
| **Status** | Draft |

---

## 1. Overview

A lightweight, mobile-first web application for the Douthwaite-Green household to plan weekly meals, manage a recipe collection, and generate aggregated shopping lists. Hosted on douthwaite-green.com, the app serves as a single shared household tool. The primary use context is mobile devices (planning at the kitchen table, shopping in the supermarket) with desktop as a secondary experience.

The core problem: meal planning currently happens ad hoc, leading to repeated meals, inefficient shopping trips, and food waste. This app replaces scattered notes and mental load with a simple, visual system.

---

## 2. Goals & Non-Goals

### Goals

- Reduce weekly meal planning time to under 10 minutes
- Eliminate forgotten ingredients and duplicate shopping
- Build a persistent, searchable recipe collection with images
- Generate a consolidated shopping list exportable to Apple Reminders or CSV
- Deliver a mobile-first, responsive experience optimised for phone use in the kitchen and supermarket

### Non-Goals (v1)

- Multi-household or social features
- Nutritional tracking or calorie counting
- Automated meal suggestions or AI-generated recipes (roadmap item)
- Recipe URL import/scraping (roadmap item)
- Pantry inventory tracking
- Integration with grocery delivery services

---

## 3. Users & Access

The app supports a single household account. Both users share one login. Authentication via Supabase Auth with email/password. Hosted at a subdomain of douthwaite-green.com (e.g. meals.douthwaite-green.com).

### Auth Requirements

- Email + password sign-in via Supabase Auth
- Persistent session (stay logged in on trusted devices)
- Simple sign-in page with no registration flow (accounts pre-created)
- Protected routes: all app pages require authentication

---

## 4. Responsive Design & Mobile-First

The app is designed mobile-first. All layouts, navigation, and interactions must work well on screens from 320px upwards. Desktop is supported but secondary.

### Breakpoints

| Name | Width | Layout Behaviour |
|---|---|---|
| **Mobile** | <640px | Single column. Bottom tab navigation. Full-width cards. Stacked filters. Shopping list as full-screen overlay. |
| **Tablet** | 640–1024px | Two-column recipe grid. Top navigation. Side-sheet shopping list. |
| **Desktop** | >1024px | Three-column recipe grid. Top navigation with full labels. Slide-over shopping list panel. |

### Mobile Navigation

- On mobile (<640px), the top bar shows only the app logo and shopping list icon
- Primary navigation (Recipes, Plan) moves to a fixed bottom tab bar
- Bottom tabs use icons with short labels for easy thumb access
- Shopping list opens as a full-screen overlay on mobile, slide-over panel on tablet/desktop
- All modals (recipe detail, add/edit recipe) display as full-screen sheets on mobile

### Touch & Interaction

- Minimum touch target size: 44x44px for all interactive elements
- Ingredient quantity +/- controls sized for comfortable thumb use
- Swipe-friendly recipe card grid with comfortable spacing
- Form inputs use appropriate mobile keyboard types (numeric for quantities, URL for source links)

### Design Principles

The following design rules apply globally across the application to ensure a consistent, polished feel:

- **No emoji in the UI.** All visual indicators must use SVG icons or styled UI elements. Emoji may appear in seed/test data as image placeholders only, and will be replaced by user-uploaded photos in production.
- Recipe cards show description text truncated to 2 lines with CSS line-clamp. Full description is visible in the detail view.
- Tags on recipe cards are limited to 2 visible; remaining tags are visible in the detail view only.
- Every view must have a well-designed empty state with a contextual call-to-action (e.g. empty plan prompts the user to browse recipes).
- When a recipe is already in the plan, the "Add to Plan" button on its card shows a disabled "In Plan" state rather than raising a warning dialog.
- Shopping list checkboxes use green fill with a checkmark icon and strikethrough text to indicate checked items.
- Tag input in the recipe form is freeform text entry for v1. Autocomplete from existing tags is a v2 enhancement.

---

## 5. Feature Specification

### 5.1 Recipe Collection

The recipe collection is the core data model. Recipes are displayed as a grid of visual cards and can be filtered, searched, and managed.

#### Recipe Data Model

| Field | Type | Notes |
|---|---|---|
| **title** | string | Required. Display name for the recipe. |
| **description** | text | Optional. Short summary of the dish (1–2 sentences). Displayed on recipe cards and the ingredients tab of the detail view. |
| **image** | file/URL | Optional. Uploaded photo or URL reference. Stored in Supabase Storage. |
| **ingredients** | array | Required. List of objects: { name, quantity, unit }. Used for shopping list aggregation. |
| **steps** | array | Optional. Ordered list of method steps (strings). Displayed on a separate Method tab in the recipe detail view. |
| **meal_type** | enum[] | Optional. One or more of: breakfast, lunch, dinner, snack, baby. Used for filtering and plan tracking. A recipe can have multiple types (e.g. "baby" and "breakfast"). |
| **servings** | integer | Required. Default serving count. Used for quantity scaling. |
| **notes** | text | Optional. Free-text field for additional tips or serving suggestions. |
| **source_url** | string | Optional. Link to the original recipe online. |
| **tags** | string[] | Optional. Freeform tags for filtering (e.g. quick, batch-cook, vegetarian). |
| **created_at** | timestamp | Auto-generated. |
| **updated_at** | timestamp | Auto-generated. |

#### UI: Recipe Cards

- Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
- Each card shows image (or placeholder), title, short description (truncated to 2 lines), meal type badges, up to 2 tags, and serving count
- Click card to open recipe detail with two tabs: Ingredients (description, ingredients list, notes) and Method (ordered steps)
- Edit and delete actions accessible from detail view
- Search bar: filters by title and tags in real-time
- Filter controls: filter by meal type (breakfast/lunch/dinner/snack/baby), by tags. On mobile, filters collapse into a scrollable horizontal row
- "Add to Plan" button on each card adds recipe to the current weekly plan; shows disabled "In Plan" state if already added

#### UI: Recipe Detail View

- Two-tab layout: Ingredients tab and Method tab, toggled via tab bar below the recipe header
- Ingredients tab shows: short description (italic), full ingredients list with quantities, and notes field
- Method tab shows: numbered steps in order, each as a distinct readable block with circular step indicators
- On mobile, detail view opens as a full-screen sheet with a close action
- On desktop, detail view opens as a centred modal

#### UI: Add/Edit Recipe

- Modal or full-screen sheet (mobile) with form fields matching data model
- Image upload via drag-and-drop or file picker (max 5MB, JPEG/PNG/WebP)
- Short description text field (plain text, 1–2 sentences)
- Dynamic ingredient rows: add/remove ingredient lines, each with name, quantity, and unit fields
- Unit selector with common options: g, kg, ml, l, tsp, tbsp, cups, pieces, bunch, tin, pack
- Dynamic method steps: ordered text fields, add/remove steps with drag-to-reorder (v2)
- Meal type multi-select
- Tag input: freeform text entry for v1 (autocomplete from existing tags planned for v2)

---

### 5.2 Weekly Meal Plan

The meal plan is a flexible weekly container. Rather than a rigid day-by-day grid, it functions as a curated list of meals for the week. A tracker shows how many breakfasts, lunches, and dinners have been planned.

#### Plan Data Model

| Field | Type | Notes |
|---|---|---|
| **week_start** | date | Monday of the plan week. Used as the plan identifier. |
| **recipes** | relation[] | Many-to-many with recipes. Each entry includes servings_override (nullable). |
| **status** | enum | planning | active | archived. Auto-archives past weeks. |

#### UI: Plan View

- Header showing current week (e.g. "Week of 3 March 2026") with previous/next navigation
- Meal type tracker: visual counters showing e.g. Breakfasts: 3 | Lunches: 2 | Dinners: 5 | Baby: 2. On mobile, tracker items wrap into a compact grid
- List of planned meal cards (compact versions of recipe cards) grouped or filterable by meal type
- Each planned meal shows: recipe title, image thumbnail, servings (adjustable inline via +/- controls), and a remove button
- Adjusting servings on a planned meal overrides the default for shopping list calculation only
- "Add meals" action opens recipe collection with filtering; selecting a recipe adds it to the plan
- Empty state: friendly prompt to start adding meals with a link to the recipe collection

---

### 5.3 Shopping List & Export

The shopping list is auto-generated from the current week's meal plan. It aggregates ingredients across all planned meals, scaling quantities by the servings set for each meal.

#### Aggregation Logic

- Combine identical ingredients (matching on normalised name + unit) across all planned recipes
- Scale quantities: if a recipe serves 4 but the plan specifies 2 servings, halve quantities
- Handle unit conflicts gracefully: if the same ingredient appears in different units, list separately (e.g. "200g butter" and "2 tbsp butter" remain distinct)
- Display grouped by ingredient name, sorted alphabetically

#### UI: Shopping List View

- Accessible from the navigation via a clipboard/list icon with item count badge
- On mobile: full-screen overlay with close button. On tablet/desktop: slide-over panel from the right
- Each item shows: ingredient name, total quantity, unit, and a remove button
- Remove button on any item (recipe-sourced or manually added) hides it from the list and updates the badge count. Removed recipe-sourced items reappear if the plan is modified. Manually added items are deleted permanently.
- Checkbox to mark items as "got it" with green fill, checkmark icon, and strikethrough text (local state, not persisted)
- Ability to manually add extra items not from recipes (e.g. "kitchen roll")
- Large touch targets (44px+) for checkboxes, remove buttons, and add button for comfortable mobile use

#### Export Options

- **Download as CSV:** columns for Item, Quantity, Unit. One click download.
- **Copy as Checklist (Apple-compatible):** copies in checklist format using `- [ ] item - quantity unit` per line. When pasted into Apple Notes, this format auto-converts to interactive checkboxes. When pasted into Apple Reminders, each line becomes a separate reminder item.
- **Add to Apple Reminders:** uses Reminders URL scheme to create checklist items. Fallback: the Apple-compatible clipboard format described above.

---

## 6. Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) with TypeScript, Tailwind CSS |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Storage, Row-Level Security) |
| **Hosting** | Vercel or Netlify, deployed to meals.douthwaite-green.com |
| **Image Storage** | Supabase Storage bucket with public read access |
| **Auth** | Supabase Auth with email/password, JWT sessions |
| **Export** | Client-side CSV generation; Apple Reminders via URL scheme |

### Database Schema (Supabase/PostgreSQL)

Core tables: recipes (including description and steps columns), ingredients (child of recipes), meal_plans, meal_plan_recipes (junction table with servings_override). Row-Level Security policies scoped to the single authenticated household account. Full schema to be defined during implementation.

### Key Technical Decisions

- Mobile-first responsive design using CSS container queries and Tailwind breakpoints
- Ingredients stored as structured rows (not JSON blobs) to enable aggregation queries
- Steps stored as a JSON array on the recipe record for simplicity (no need for relational querying)
- Shopping list computed client-side from plan + recipe data to avoid unnecessary server round-trips
- Images stored in Supabase Storage with a 5MB limit; thumbnails generated client-side before upload
- No SSR required; Vite SPA is sufficient for this use case
- RLS policies: all data scoped to a single user_id; simple but secure

---

## 7. User Stories

| ID | User Story | Acceptance Criteria |
|---|---|---|
| **US-01** | As a user, I can sign in with email and password so that my recipes and plans are protected. | Redirects to app on success; shows error on failure; session persists across browser restarts. |
| **US-02** | As a user, I can add a new recipe with title, description, image, ingredients, steps, and notes so I can build my collection. | All required fields validated; image preview shown before save; recipe appears in collection immediately. |
| **US-03** | As a user, I can browse my recipe collection as a responsive grid of cards so I can find meals visually on any device. | Cards show image, title, description, meal type; grid adapts from 1 to 3 columns by screen width; search filters in real-time. |
| **US-04** | As a user, I can filter recipes by meal type and tags so I can find the right recipe quickly. | Filters combinable; results update immediately; active filters clearly indicated. |
| **US-05** | As a user, I can view a recipe with Ingredients and Method tabs so I can see what I need and how to cook it. | Ingredients tab shows description, ingredient list, and notes. Method tab shows numbered steps. |
| **US-06** | As a user, I can add recipes to my weekly plan so I know what we are eating this week. | Recipe added via button on card; plan counter updates; if recipe already in plan, button shows disabled "In Plan" state. |
| **US-07** | As a user, I can see a tracker of how many meals I have planned by type so I know if I have covered the week. | Counters for breakfast/lunch/dinner/baby update as meals are added/removed. |
| **US-08** | As a user, I can adjust servings for a planned meal so the shopping list reflects what I actually need. | Inline servings control; changes immediately reflected in shopping list quantities. |
| **US-09** | As a user, I can view an auto-generated shopping list aggregated from my plan so I have one list to take shopping. | Ingredients combined by name+unit; quantities scaled by servings; list sorted alphabetically. |
| **US-09a** | As a user, I can remove any item from the shopping list so I can skip things I already have at home. | Remove button on every item; removed recipe-sourced items are hidden but reappear if the plan changes; removed manual items are deleted; badge count updates immediately. |
| **US-10** | As a user, I can export my shopping list as CSV so I can use it in other tools. | CSV downloads with one click; includes item, quantity, unit columns. |
| **US-11** | As a user, I can copy my shopping list in Apple-compatible checklist format so it converts to checkboxes when pasted into Apple Notes or creates items in Reminders. | Copy button writes checklist-formatted text (- [ ] prefix) to clipboard; pasting into Apple Notes produces interactive checkboxes; pasting into Reminders creates individual items. |
| **US-12** | As a user, I can use the full app comfortably on my phone so I can plan meals and shop without a laptop. | All views work on 320px+; navigation adapts to bottom tabs on mobile; touch targets are 44px+. |

---

## 8. Feature Roadmap

| Feature | Priority | Release |
|---|---|---|
| Recipe CRUD with image upload | P0 | v1 (MVP) |
| Recipe description and method steps | P0 | v1 (MVP) |
| Recipe detail with Ingredients/Method tabs | P0 | v1 (MVP) |
| Recipe card grid with search and filters | P0 | v1 (MVP) |
| Mobile-first responsive design | P0 | v1 (MVP) |
| Mobile bottom tab navigation | P0 | v1 (MVP) |
| Flexible weekly meal plan | P0 | v1 (MVP) |
| Meal type tracker (B/L/D counters) | P0 | v1 (MVP) |
| Aggregated shopping list with scaling | P0 | v1 (MVP) |
| Shopping list item removal | P0 | v1 (MVP) |
| Baby meal type with dedicated filter and tracker | P0 | v1 (MVP) |
| CSV export | P0 | v1 (MVP) |
| Apple-compatible clipboard copy | P0 | v1 (MVP) |
| Apple Reminders export | P1 | v1 (MVP) |
| Supabase Auth (email/password) | P0 | v1 (MVP) |
| Manual extra items on shopping list | P1 | v1 (MVP) |
| Drag-to-reorder method steps | P2 | v2 |
| Tag autocomplete from existing tags | P2 | v2 |
| Recipe URL import (scrape from web) | P1 | v2 |
| AI-generated meal suggestions | P2 | v2 |
| AI recipe generation from ingredients | P2 | v2 |
| Aisle/category grouping on shopping list | P2 | v2 |
| Meal plan history and favourites | P2 | v2 |
| Pantry staple tracking | P3 | v3+ |

---

## 9. Success Metrics

Given this is a household tool rather than a commercial product, success is measured qualitatively:

1. Weekly meal planning happens consistently (target: every Sunday)
2. Shopping trips require only one list (no forgotten items)
3. Recipe collection grows over time (target: 30+ recipes within 3 months)
4. Both household members find the app easier than current ad-hoc approach
5. App is used comfortably on mobile without reaching for a laptop
6. Reduction in food waste from better-planned quantities

---

## 10. Open Questions

| # | Question | Decision Needed By |
|---|---|---|
| 1 | Apple Reminders deep integration: is the URL scheme reliable enough for v1, or is Apple-compatible clipboard copy sufficient? Need to test on iOS 17+. | Before v1 development |
| 2 | Should archived meal plans be browsable for re-use, or just historical data? | v1 development |
| 3 | Subdomain choice: meals.douthwaite-green.com or food.douthwaite-green.com or other? | Before deployment |
| 4 | Do we need offline support (PWA) for use in supermarkets with poor signal? | v1 or v2 |
| 5 | Unit normalisation: how aggressive? e.g. auto-convert 1000g to 1kg? | During implementation |
| 6 | Should method steps support rich text or images, or plain text only for v1? | Before v1 development |