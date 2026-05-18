# Next Session Context — BuildTrack
**Updated:** 2026-05-18 07:57 IST

## Completed this session (2026-05-18)
- PrefsContext: BottomNav prefs now instant (no page reload needed)
- Add to Calendar: CalendarPlus button on reminders → .ics download
- UI polish: amber brand color for FAB + active nav, phase progress bar, empty states for Budget/Funds, changelog modal on footer tap (v2.0.0/v1.0.0/v0.1.0)
- Dashboard phase list: only Completed (strikethrough) + In Progress shown
- Dashboard phase names with status dots
- Edit Project Details: pencil icon in More → Project Info
- Dashboard widget customisation: 8 toggles in Display Preferences → Home Page Widgets
- QuickAdd reordering: ChevronUp/Down in Display Preferences
- Deliverables add/rename in phase edit mode (PhasesTab)
- Photo persistence fix: photo_url saved to phases.deliverables in DB on upload
- Log Work ↔ Tracker link: status=Completed auto-patches deliverable in Tracker
- Quick Expense simplified: existing item or new item, with receipt photo upload
- receipt_url column added to budget_items (SQL run: ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS receipt_url text)
- Tracker phase view: receipt photos from budget_items shown as thumbnails
- Users tab fix: getSession() used for instant admin check
- Version footer unified: v2.0.0 across all pages
- Deploy alias rule: always vercel alias after every vercel --prod

## Immediate verify at session start
- buildtrackapp.vercel.app loads and dashboard shows phase progress bar
- Quick Expense → Existing item mode shows budget items grouped by category
- Tracker phase expand → receipt thumbnails appear if any exist
- More → Display Preferences → Home Page Widgets shows 8 toggles
- Log Work with status=Completed → check that deliverable turns green in Tracker

## Known issues / debt
- Vasudha's old photo URLs still point to Supabase Storage (migration script at scripts/migrate-photos-to-b2.ts, not yet run)
- VendorsTab exists in codebase but unreachable from nav
- TEST_REPORT.md manual tests still pending (photo upload, CSV export)

## Next tasks (confirm at session start)
- Run photo migration script for old Supabase Storage URLs
- Add VendorsTab to nav or remove dead code
- Manual TEST_REPORT.md verification

## Cold Start Checklist
1. Read this file top to bottom
2. Read ~/.claude/projects/-Users-sunnyhayes-Daytona/memory/MEMORY.md
3. Read global CLAUDE.md
4. Check Helm parking lot for BuildTrack status
5. Verify buildtrackapp.vercel.app loads correctly before any work

## Credentials
- Supabase project: djbvntsnpqlxcetdoofu
- B2: bucket=buildtrack-files, endpoint=s3.eu-central-003.backblazeb2.com, keyID=fa54df295099
- B2 app key: in Vercel env only (B2_APP_KEY)
- Supabase service role key: in Vercel env (SUPABASE_SERVICE_ROLE_KEY)
- Admin: sunder.v@outlook.com

## Deploy commands
```bash
cd ~/Daytona/buildtrack
vercel --prod
vercel alias <deployment-url> buildtrackapp.vercel.app
```
