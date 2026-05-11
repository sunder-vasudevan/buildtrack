# BuildTrack Project Context & Architecture Log
**Date of Entry:** 2026-05-12 (Local Time: 12:40 AM IST)

---

## 1. Project Overview & Tech Stack
BuildTrack is a premium, mobile-first residential construction project tracking dashboard.
* **Framework:** Next.js (RSC/App Router) running Next.js v16.x + Turbopack.
* **Database & Auth:** Supabase PostgreSQL with realtime channel change subscriptions.
* **Styling:** Tailwind CSS with premium dark-neutral contrasts, glowing indicators, custom animations, and mobile layout optimizations (including `pb-safe` offsets for iOS/Android home indicator safety).
* **Location & Context:** "v1.2.0 · Built in Hyderabad with ❤️".

---

## 2. Database Schema Reference (Supabase)
All data syncs with a Supabase PostgreSQL instance. The schema is comprised of:
1. **`projects`**: Basic metadata for plot dimension, building area, target timeline, location, and global target budget.
2. **`phases`**: Sequence of construction milestones (e.g. Excavation, Footings, Plinth, Slabs) mapped to planned and actual calendar periods.
3. **`daily_logs`**: Active field log entries. Mapped to deliverables, work statuses, and weather condition notes. Features an array of image storage urls (`photos`).
4. **`budget_items`**: Estimate categories and custom quotes (MEP, civil, woodwork structure) tracking budgeted targets vs actual vendor disbursements.
5. **`income`**: Capital injections received on-site (Bank loan disbursals, owner contributions).
6. **`reminders`**: Checklist items mapped to specific target dates. Highly highlighted when overdue or matching today's system clock.
7. **`windows`**: Detailed ledger representing window delivery status, material types, supplier milestones, and structural rooms.
8. **`documents`**: PDF files, blueprint drawing links, or CAD layouts for technical structural architecture.
9. **`workers`**: Directory contact list of local builders, masonry squads, plumbing contractors, etc. *(Currently hidden/de-emphasized from active views).*

---

## 3. High-Density Unified Page Architecture
To maximize structural efficiency and eliminate redundant page tabs on phone displays, the navigation layout is condensed into a pristine **4-Tab Symmetric Navigation Grid** centered around a floating **Quick-Add FAB**:

### Tab 1: Overview (`/dashboard`)
* Serves as your high-level project health room.
* **Net Cash-In-Hand Glow Banner:** Automatically computes `Total Received Capital - Total actual spent`. Highlights in **Premium Blue 🟦** if capital is healthy, or pulses in **Deficit Warning Red 🟥** if site costs outpace actual deposits.
* **4-Card Metrics Grid:** Realtime statistics showing Project Target Budget, Actual Funds Received, Actual Spent to date, and Days Left on timeline.
* **Dual Segment Progress Slider:** Visually charts Spent of Capital alongside Spent of Budget simultaneously.
* **Pending Reminders Widget:** Highlights Checklist alerts broken down into `Overdue` (blinking amber/red), `Due Today`, and `Upcoming`. Allows interactive checklist completion toggle.
* **Recent Progress Feed:** Chronological journal snippet of the latest daily site activity logs.

### Tab 2: Tracker (`/tracker`)
* Consolidated into a **single-page vertical accordion grid** (no internal subtabs):
  1. **Phases & Schedule Progress Accordion** *(Starts expanded by default)*: Visual list of construction stages, schedule timeline metrics, and actual vs planned calendar variance.
  2. **Daily Progress Logbook Accordion** *(Starts collapsed by default)*: Fully featured journal feed including description, weather status, issue resolution checklists, photo carousels, and log submission portal.

### Tab 3: Finances (`/finances`)
* Consolidated into a **single-page ledger grid** (no internal tabs):
  1. **Funds Received Accordion** *(collapsible)*: Complete log list of capital deposits, bank disbursals, date tags, and notes, accompanied by a quick modal form to record new deposits.
  2. **Budget Categories Accordion** *(collapsible)*: Nested accordions organizing your estimated quotes (Civil, MEP, Steel, Woods, etc.) displaying variance calculations, quoted figures, actual payouts, and interactive vendor update fields.

### Tab 4: Project Info (`/more` — Renamed)
* Visible in bottom navigation and page header as **"Project Info"** (routed under `/more` for backward stability). Serves as a static reference panel organized by:
  1. **Project Details Card**: Static metadata (Plot dimensions, building areas, project target cost, and date scopes).
  2. **Windows Ordering & Delivery Accordion** *(collapsible)*: Interactive frame supplier tracking list representing rooms, ordered and delivery dates, and status badges.
  3. **Blueprint Plans & Drawings Accordion** *(collapsible)*: File upload portal and reference library for architectural layout plans, designs, and engineering drawings.
  4. **Settings & Export Accordion** *(collapsible)*: Export utilities permitting on-demand Excel/CSV compilation for Expenses, Funds, Status, and Activity Logs. Compiles dynamically at runtime upon click to avoid load delay.

---

## 4. Key Performance & UI Standards
* **On-Demand Compiles:** Export spreadsheet builders query database layers dynamically *only* when the corresponding button is clicked. This ensures pages load instantly (0ms setup delay).
* **Bottom Bar Notification Badge:** `BottomNav.tsx` registers a Supabase Realtime Channel listener on the `reminders` table to compute pending alerts due today or overdue. Automatically rendering a pulsing red notification pill over the Overview tab icon.
* **Interactive Modals:** Quick add actions (such as logging custom daily updates, adding expense transactions, uploading files) are triggered using client modals keeping pages lightweight.

---

## 5. Universal UI Architectural Guideline: Accordions by Default
As a fundamental architectural rule for Buildtrack (or any adjacent mobile-first application developed within this workspace):
* **The Accordion Rule:** Any secondary data grouping, multi-field category, sub-ledger checklist, document vault, or configuration segment MUST be implemented as a collapsible vertical accordion block by default.
* **Rationale & UX Drivers:**
  1. **Reduces Scroll Fatigue:** Limits height expansion on compact mobile viewports, allowing users to scan high-level structures at a glance.
  2. **Eliminates Complex Subtabs:** Offers quick on-demand exploration without requiring separate page routes or tab bars.
  3. **Interaction Consistency:** Guarantees uniform tactile muscle-memory across all core features (Tracker, Finances, and Project Info all utilize the exact same accordion indicators).

