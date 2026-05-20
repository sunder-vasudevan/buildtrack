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

## TODO @ Home (Mac) — Security hardening

Everything below requires the GitHub web UI or local terminal on your Mac.
The code changes are already pushed on branch `claude/investigate-github-access-cbzwL` — merge that PR first, then do these.

### Step 1 — Merge the security PR
- Open the PR for branch `claude/investigate-github-access-cbzwL` on GitHub
- Review and merge into `main`

### Step 2 — Branch protection on `main` (GitHub UI)
For **every repo** (start with `buildtrack`):
1. Go to repo → Settings → Branches → **Add branch ruleset**
2. Set ruleset name: `main protection`
3. Target: `main`
4. Enable:
   - Require a pull request before merging
   - Required approvals: 1
   - Dismiss stale reviews on new push
   - Block force pushes
   - Restrict deletions

### Step 3 — Review and rotate all API keys

Go through every service this app touches. Rotate any key that is older than 90 days, has broad permissions, or you can't account for.

**Supabase**
- Dashboard → Settings → API
- Regenerate `anon` key and `service_role` key
- Update both in Vercel env vars after rotating
- Check Row Level Security is ON for all tables (Table Editor → RLS)

**Vercel**
- Project → Settings → Environment Variables
- Remove any variables that are no longer used
- For each key: confirm it's scoped to the right environments (Production / Preview / Development)

**Google Drive / Service Account** (if backup-to-drive is active)
- Google Cloud Console → IAM → Service Accounts → buildtrack service account
- Keys tab → delete old keys → Create new key → download JSON
- Update the key in Vercel env vars

**GitHub Personal Access Tokens**
- github.com/settings/tokens → review each token
- Revoke any with more than `repo` scope, or anything unused
- Rotate tokens older than 90 days

**General rule for any future service added:**
- Use the narrowest scope/permission available
- Set an expiry date when the service allows it
- Record where each key is used so rotation is easy

### Step 4 — Enable Secret Scanning + Push Protection
For **every repo**:
- Settings → Security → **Secret scanning** → Enable
- Also enable **Push protection** (blocks commits containing secrets)

### Step 5 — Review account security
- github.com/settings/security-log — look for unexpected logins
- github.com/settings/sessions — revoke unknown sessions
- github.com/settings/apps — revoke OAuth apps you don't recognise

### Step 6 — Migrate from npm to pnpm + add Socket.dev

**Why:** npm's flat node_modules allows phantom dependencies — transitive packages your code never declared can be required and executed. Any package in the tree can run arbitrary shell commands via install scripts during `npm install`. pnpm fixes both by using a symlinked store where each package can only see what it declared.

**Evaluated alternatives:** pnpm (best drop-in), Yarn Berry PnP (strictest, needs compat check), Bun (fastest, not fully stable for Next.js yet), Deno (no node_modules at all, best for non-Next.js scripts). Verdict: **pnpm now, watch Bun for future greenfield apps.**

pnpm is faster, stricter about phantom dependencies, and has a better security model (isolated node_modules by default).

**Install pnpm on Mac (if not already)**
```bash
brew install pnpm
```

**Migrate this repo**
```bash
# Remove npm artifacts
rm -rf node_modules package-lock.json

# Install with pnpm (generates pnpm-lock.yaml)
pnpm install

# Verify app still runs
pnpm dev
```

**Update scripts everywhere npm is hardcoded**
- `package.json` scripts: replace `npm run` → `pnpm` where referenced in docs/scripts
- `vercel.json`: change `installCommand` to `pnpm install --frozen-lockfile && pnpm audit --audit-level=high`
- `.github/workflows/audit.yml`: replace `npm ci` / `npm audit` with `pnpm install --frozen-lockfile` / `pnpm audit --audit-level=high`; update setup-node `cache: "npm"` → `cache: "pnpm"`; add `uses: pnpm/action-setup` step before setup-node
- `.npmrc`: replace `save-exact=true` with a `.npmrc` for pnpm or use `pnpm config set save-exact true`

**Commit**
```bash
git add pnpm-lock.yaml package.json vercel.json .github/workflows/audit.yml
git rm package-lock.json
git commit -m "chore: migrate from npm to pnpm"
```

**Also: install Socket.dev GitHub App**
- Go to socket.dev → Install GitHub App → grant access to all repos
- Free tier scans every PR's dependency changes for supply chain attacks (detects new attacks before a CVE exists — Dependabot only catches known CVEs)

**Apply to all future repos** — start new projects with `pnpm create next-app` instead of `npx create-next-app`. Add Socket.dev on day one.

---

### Step 7 — Apply to future repos
When starting any new app, copy from `buildtrack`:
- `.github/workflows/audit.yml`
- `.github/workflows/dependency-review.yml`
- `.github/dependabot.yml`
- `CLAUDE.md`
Then do Steps 2–6 for that repo before first deploy.

---

## Open / Parked
- New deliverable names typed in log form not written back to phases.deliverables
- StatusBadge defined inside QuickAddModal.tsx (cosmetic, low priority)
- VendorsTab exists but unreachable from nav
