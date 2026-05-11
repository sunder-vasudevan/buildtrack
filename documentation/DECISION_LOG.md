# BuildTrack — Decision Log

> Records key design and technical decisions — the *why* behind the codebase.

---

### [DECISION-001] — Stack selection
**Date:** 2026-05-11
**Version / Phase:** v0.1.0 / Session 1
**Decision:** Next.js 15 App Router + Supabase PostgreSQL + Tailwind CSS + Vercel
**Alternatives considered:** Remix, plain React + Express, Firebase
**Reasoning:** Next.js App Router gives server components for free data fetching without a separate API. Supabase provides DB + Storage + Auth in one. Already used across other Daytona projects (ARIA, BzHub).
**Trade-offs / known debt:** No auth (open app) — acceptable for personal tool. Direct Supabase client calls from client components instead of server actions — simpler for MVP, no caching benefits.

### [DECISION-002] — No authentication
**Date:** 2026-05-11
**Version / Phase:** v0.1.0 / Session 1
**Decision:** No auth — open app, no login required
**Alternatives considered:** Supabase email/password auth with RLS
**Reasoning:** Personal tool, single user, speed to ship. Auth adds 1-2 days of setup for zero benefit when it's just one person on one device.
**Trade-offs / known debt:** App is publicly accessible if deployed URL is shared. Add auth if ever made multi-user.

### [DECISION-003] — Cards not tables on mobile
**Date:** 2026-05-11
**Version / Phase:** v0.1.0 / Session 1
**Decision:** All list views use cards (not HTML tables)
**Alternatives considered:** Data tables with horizontal scroll
**Reasoning:** Mobile-first constraint — tables are unusable at 375px. Cards stack naturally, touch targets are larger.
**Trade-offs / known debt:** Less data density than tables. Acceptable for this use case (9 windows, ~30 budget items).

### [DECISION-004] — Direct Supabase calls (no server actions)
**Date:** 2026-05-11
**Version / Phase:** v0.1.0 / Session 1
**Decision:** All mutations via direct Supabase JS client in client components
**Alternatives considered:** Next.js Server Actions, API routes
**Reasoning:** Simpler, less boilerplate for a personal MVP. Anon key is public-safe for this no-auth app.
**Trade-offs / known debt:** No server-side validation, no cache invalidation on mutations (requires manual state update). Acceptable for single-user tool.
