# BuildTrack — Session Notes

> Multi-user mobile-first construction tracker — auth, isolated projects, B2 storage, setup wizard.

## Current State
**Version:** v2.0.0
**Live:** https://buildtrackapp.vercel.app
**Legacy:** https://vasudha-track.vercel.app (same codebase, no auth, Vasudha's alias)
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
- More: Project Info (+ Display Preferences) / Backup / Users (admin only)
- All data isolated by RLS: user_id = auth.uid()

## DB Tables (10 + auth)
projects (+ user_id, preferences JSONB, location), phases, budget_items, daily_logs, payments, income, workers, documents, reminders, windows

## Key Schema Notes
- phases.deliverables = JSONB: [{name, planned_start, planned_due, actual_due}]
- projects.preferences JSONB: {tabs: {overview,tracker,finances,more}, quickAdd: {log,expense,funds,reminder,wish,note}}
- All tables: user_id UUID, RLS enabled
- B2 uploads: server-side presigned PUT via /api/upload, key = {user_id}/{timestamp}-{filename}
- Admin email: sunder.v@outlook.com (hardcoded in API routes + More page)

## What's Built (v2.0.0)
- Multi-user auth: email + password, open self-signup
- Setup wizard: 4 steps (project → phases → preferences → confirm)
- RLS on all 9 tables
- Backblaze B2 storage (replaces Supabase Storage)
- Display Preferences in More → Project Info (tabs + QuickAdd toggles)
- Help modal in dashboard header (? icon)
- Sign-out icon in dashboard header
- Admin: Users tab (see all signups), /api/admin/users, /api/invite
- BottomNav hidden on /auth/* and /setup

## Open / Parked
- New deliverable names typed in log form not written back to phases.deliverables
- VendorsTab exists but unreachable from nav
- Vasudha's existing photo URLs still point to Supabase Storage (old uploads not migrated to B2)
- BottomNav prefs update requires page reload (not instant)
