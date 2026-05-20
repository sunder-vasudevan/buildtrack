# BuildTrack — Session Notes

> Multi-user mobile-first construction tracker — auth, isolated projects, B2 storage, setup wizard.

## Current State
**Version:** v2.3.7
**Live:** https://buildtrackapp.vercel.app
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
- Finances: Budget / Funds / Quick Expenses tabs
- More: Project Info / Backup / Users (admin)
- All data isolated by RLS: user_id = auth.uid()

## DB Tables
projects, phases, budget_items, daily_logs, payments, income, workers, documents, reminders, windows, expenses

## What's Built (v2.3.7)
- All v2.2.0 features + Add Phase modal (v2.3.0)
- Quick Expense inline edit (amount, date, category, description)
- Suspense + loading.tsx skeletons on all pages (instant first paint)
- More → Project Info: fast load with skeleton
- B2 key rotated (keyID: 003fa54df2950990000000004)

## Parked Items
→ See Helm parking lot — project: BuildTrack
