# BuildTrack — Session Notes

> Mobile-first farmhouse construction tracker — real-time budget, phases, windows, daily logs.

## Current State
**Phase:** 1 — Full app scaffold complete
**Version:** v0.1.0
**Repo:** https://github.com/sunder-vasudevan/buildtrack (to be created)
**Local:** ~/Daytona/buildtrack
**Live:** https://vasudha-track.vercel.app

## Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Components | Recharts (budget chart), Lucide icons |
| Database | Supabase PostgreSQL (project: djbvntsnpqlxcetdoofu) |
| Storage | Supabase Storage (bucket: buildtrack-photos) |
| Hosting | Vercel |
| Auth | None (personal app) |

## What's Built
- [x] Full app scaffold — all 7 pages
- [x] Supabase schema (7 tables) + seed data (1 project, 6 phases, 9 windows, 15 vendors, 30 budget items)
- [x] Dashboard — stat cards, phase progress, recent logs, overdue alert
- [x] Windows — card list, filter chips, full edit modal (status/cost/dates/vendor/notes)
- [x] Budget — summary cards, Recharts BarChart, accordion by category
- [x] Phases — expandable cards, deliverables checklist, edit form
- [x] Daily Logs — timeline, add log form
- [x] Vendors — list with category filter, detail modal
- [x] Bottom nav (mobile-first)

## Next Feature ← START HERE NEXT SESSION
**[FEAT-001]** — Vercel deploy + photo upload (Supabase Storage)
- Deploy to Vercel, set env vars
- Wire photo upload in Windows modal and Daily Logs form
- Create buildtrack-photos Storage bucket (public)
- Test on actual phone (iPhone)

## What Shipped This Session
v0.1.0 — Full scaffold: all pages, DB schema, seed data, Supabase wired. Pending: Vercel deploy.

## Open Flags
- Photo upload UI exists but not tested end-to-end on real phone
- Next.js upgraded to v16 (CVE-2025-66478 patch applied)
