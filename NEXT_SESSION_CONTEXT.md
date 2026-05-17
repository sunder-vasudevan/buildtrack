# Next Session Context — BuildTrack
**Created:** 2026-05-17 21:16 IST

## Completed this session
- Multi-user auth (email + password, open self-signup)
- Supabase RLS on all 9 tables
- 4-step setup wizard (/setup)
- Backblaze B2 storage replacing Supabase Storage
- Display Preferences in More → Project Info (tabs + QuickAdd toggles, auto-saves)
- BottomNav hidden on /auth/* and /setup
- Sign-out + Help (?) icons in dashboard header
- Help modal with full guide
- Admin: Users tab, /api/admin/users, /api/invite removed (open signup)
- Finances + Tracker pages fixed to use createSupabaseServerClient
- Dashboard realtime subscriptions fixed with user_id filters
- formatDate: switched to deterministic format (no SSR hydration mismatch)
- v2.0.0 deployed to buildtrackapp.vercel.app

## Immediate verify at session start
- Dashboard loads without crashing
- Finances shows budget items + funds
- Tracker shows phases + logs
- Sign-out works from dashboard header
- Help modal opens
- Display Preferences toggles save and reflect in nav

## Known issues / debt
- BottomNav prefs update requires page reload (not instant after toggle in Project Info)
- Vasudha's old photo URLs still point to Supabase Storage (pre-B2 uploads not migrated)
- VendorsTab exists in codebase but unreachable from nav

## Next tasks (confirm at session start)
- Make BottomNav update instantly when prefs change
- Migrate old Supabase Storage photo URLs to B2
- TEST_REPORT.md manual tests still pending (photo upload, CSV export)

## Cold Start Checklist
1. Read this file top to bottom
2. Read ~/.claude/projects/-Users-sunnyhayes-Daytona/memory/MEMORY.md
3. Read global CLAUDE.md
4. Check Helm parking for BuildTrack
5. Verify buildtrackapp.vercel.app loads correctly before any work

## Credentials
- Supabase project: djbvntsnpqlxcetdoofu
- B2: bucket=buildtrack-files, endpoint=s3.eu-central-003.backblazeb2.com, keyID=fa54df295099
- B2 app key: in Vercel env only (B2_APP_KEY)
- Supabase service role key: in Vercel env (SUPABASE_SERVICE_ROLE_KEY)
- Admin: sunder.v@outlook.com, UUID: ab149df2-75bc-4d76-bd18-b357bbf6da36

## Deploy commands
```bash
cd ~/Daytona/buildtrack
vercel --prod
vercel alias set <deployment-url> buildtrackapp.vercel.app
```
