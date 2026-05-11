# BuildTrack — Release Notes

---

## v0.1.0 — 2026-05-11
**Session:** 1
**Features:**
- Full app scaffold — 7 pages (Dashboard, Windows, Budget, Phases, Logs, Vendors, More)
- Supabase schema: 7 tables (projects, vendors, phases, windows, budget_items, daily_logs, payments)
- Seed data: 1 project, 6 phases, 9 windows (with PRIVACY/FROSTED/LOUVRE alerts), 15 vendors, 30 budget items
- Mobile-first layout with bottom tab nav
- Windows modal: full edit (status, cost, dates, vendor, notes)
- Budget: Recharts bar chart (Quoted vs Actual by category), accordion line items
- Phases: expandable with deliverables checklist + edit form
- Daily Logs: timeline + add log form
- Vendors: category filter + detail modal

**Stack confirmed:**
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase PostgreSQL + Storage
- Recharts, Lucide icons
- Vercel (deploy pending)

**Next:** FEAT-001 — Vercel deploy + photo upload
