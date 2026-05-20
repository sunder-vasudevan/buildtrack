# BuildTrack — Session Notes

> Multi-user mobile-first construction tracker — auth, isolated projects, B2 storage, setup wizard.

## Current State
**Version:** v2.2.0
**Live:** https://buildtrackapp.vercel.app
**Legacy:** https://vasudha-track.vercel.app
**Local:** ~/Daytona/buildtrack
**Supabase:** djbvntsnpqlxcetdoofu (Singapore)

## Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Auth | Supabase email + password |
| Database | Supabase PostgreSQL + RLS |
| Storage | Backblaze B2 (buildtrack-files, eu-central-003) |
| Hosting | Vercel (buildtrackapp.vercel.app) |
| Session | @supabase/ssr + proxy.ts |

## Architecture
- Auth: /auth/login → / → /dashboard or /setup
- Nav: Overview | Tracker | [FAB +] | Finances | More
- Tracker: Phases / Logs / Plans tabs
- Finances: Budget (planned) / Funds / Unplanned Expenses tabs
- More: Project Info (+ Display Prefs + Dashboard Widgets) / Backup / Users (admin)
- All data isolated by RLS: user_id = auth.uid()

## DB Tables (11 + auth)
projects, phases, budget_items (receipt_url), daily_logs, payments, income, workers, documents, reminders, windows, **expenses** (new v2.2.0)

## Key Schema Notes
- expenses: amount, expense_date, category, description, phase_id, deliverable_name, budget_item_id (nullable — link later), receipt_url, user_id
- budget_items: planned estimates only. actual_cost updated when expense is linked.
- spent = SUM(budget_items.actual_cost) + SUM(expenses WHERE budget_item_id IS NULL) — no double counting
- phases.deliverables = JSONB: [{name, planned_start, planned_due, actual_due, photo_url, status}]
- projects.preferences JSONB: {tabs, quickAdd, quickAddOrder[], dashboardWidgets{}}
- Admin email: sunder.v@outlook.com

## What's Built (v2.2.0)
- All v2.1.0 features
- Dashboard phase list as accordion (tap to expand: dates + deliverables + Open in Tracker)
- Expense Rebuild: new `expenses` table with RLS
- Quick Expense: frictionless (amount → date → category → description → photo → Save)
- Finances: Unplanned Expenses section with inline Link flow (create phase/deliverable on spot)
- Dashboard spent: double-count-safe formula

## Parked Items
→ See [Helm parking lot](https://usehelm.vercel.app) — project: BuildTrack
