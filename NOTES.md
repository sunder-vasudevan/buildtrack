# BuildTrack — Session Notes

> Multi-user mobile-first construction tracker — auth, isolated projects, B2 storage, setup wizard.

## Current State
**Version:** v2.1.0
**Live:** https://buildtrackapp.vercel.app
**Legacy:** https://vasudha-track.vercel.app (same codebase, Vasudha's alias)
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
- Finances: Budget / Funds tabs
- More: Project Info (+ Display Preferences + Dashboard Widgets) / Backup / Users (admin only)
- All data isolated by RLS: user_id = auth.uid()

## DB Tables (10 + auth)
projects (+ user_id, preferences JSONB), phases, budget_items (+ receipt_url), daily_logs, payments, income, workers, documents, reminders, windows

## Key Schema Notes
- phases.deliverables = JSONB: [{name, planned_start, planned_due, actual_due, photo_url, status}]
- projects.preferences JSONB: {tabs, quickAdd, quickAddOrder[], dashboardWidgets{}}
- budget_items.receipt_url: text (added 2026-05-18)
- All tables: user_id UUID, RLS enabled
- B2 uploads: server-side presigned PUT via /api/upload
- Admin email: sunder.v@outlook.com (hardcoded in API routes + More page)

## What's Built (v2.1.0)
- All v2.0.0 features (auth, RLS, setup wizard, B2, display prefs, help modal)
- PrefsContext: instant nav updates without page reload
- Add to Calendar: .ics download on reminders with due_date
- UI polish: amber brand color, phase progress bar on dashboard, empty states, changelog modal
- Dashboard phase list: shows only Completed + In Progress phases
- Phase name list with status dots on dashboard progress bar
- Edit Project Details: pencil icon in More → Project Info (all fields editable)
- Dashboard widget customisation: 8 toggles in More → Display Preferences
- QuickAdd reordering: up/down arrows, order stored in preferences.quickAddOrder[]
- Deliverables add/rename in Tracker phase edit mode
- Photo persistence fix: phase deliverable photos saved to DB (not just state)
- Log Work ↔ Tracker linked: Completed log auto-marks deliverable done in Tracker
- Quick Expense simplified: existing item (4 fields) or new item mode, with receipt photo upload
- Tracker phase view: shows receipt photos from linked budget_items
- Users tab fix: loads immediately via getSession() (no flash)
- Version footer unified: v2.0.0 across all pages
- receipt_url column added to budget_items

## Open / Parked
- Vasudha's old photo URLs still point to Supabase Storage (pre-B2 uploads not migrated)
- VendorsTab exists but unreachable from nav
- TEST_REPORT.md manual tests still pending (photo upload, CSV export)
