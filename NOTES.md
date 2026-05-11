# BuildTrack (Vasudha) — Session Notes

> Mobile-first farmhouse construction tracker — real-time budget, phases, deliverables, daily logs, funds.

## Current State
**Version:** v0.4.0
**Live:** https://vasudha-track.vercel.app
**Repo:** https://github.com/sunder-vasudevan/buildtrack (private)
**Local:** ~/Daytona/buildtrack
**Supabase:** djbvntsnpqlxcetdoofu (Singapore, port 5432)

## Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Components | Recharts (budget chart), Lucide icons, Radix UI (Dialog, Tabs) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (bucket: buildtrack-photos, public) |
| Hosting | Vercel (aliased: vasudha-track.vercel.app) |
| Auth | None (personal app) |

## Architecture
- Nav: Overview | Tracker | [FAB +] | Finances | More
- Tracker: Phases / Logs / Plans tabs
- Finances: Budget / Funds tabs
- More: Project Info / Team / Windows tabs

## DB Tables (10)
projects, vendors, phases, windows, budget_items, daily_logs, payments, income, workers, documents

## Key Schema Notes
- phases.deliverables = JSONB: [{name, planned_start, planned_due, actual_due}]
- daily_logs.deliverable_name TEXT — links log to deliverable by name
- daily_logs.photos JSONB: [{url, caption}]
- Storage RLS: INSERT/SELECT/UPDATE/DELETE on bucket_id = 'buildtrack-photos' for {public}
- Phase actual_start_date = earliest deliverable planned_start on save
- Phase actual_end_date = latest deliverable planned_due on save

## What's Built (v0.4.0)
- All pages + nav (Overview, Tracker, Finances, More)
- QuickAdd FAB — all 3 actions wired (Works / Expense / Funds)
- Expense form — new item or update existing budget item + receipt upload
- Add Funds form — source, amount, date, notes → income table
- Log Work form — phase + deliverable dropdown (+ add new inline), photos, weather, status
- Plans upload — file → Supabase Storage → documents table
- Add Worker form (More → Team)
- Budget export CSV (expenses + income in one file)
- Deliverable dates: planned_start (editable), planned_due (editable), actual_due (editable)
- Phase actual dates auto-derived from deliverable dates on save
- Deliverable status: green tick when actual_due set, red circle if overdue

## Open / Parked
- New deliverable names typed in log form not written back to phases.deliverables
- StatusBadge defined inside QuickAddModal.tsx (cosmetic, low priority)
- VendorsTab exists but unreachable from nav
