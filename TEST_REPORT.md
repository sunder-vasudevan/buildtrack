# BuildTrack — Test Report

## v1.0.0 — Multi-User Auth + Onboarding (2026-05-17)

> Status: **PENDING** — run after deploy to buildtrackapp.vercel.app

### Test Flow

#### Auth
| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Admin sends invite to new email | User receives invite email | ⬜ |
| 2 | New user clicks invite link | Lands on /auth/set-password | ⬜ |
| 3 | User sets password (8+ chars) | Redirected to /setup wizard | ⬜ |
| 4 | User sets mismatched passwords | Error shown, no redirect | ⬜ |
| 5 | Returning user logs in (email + password) | Redirected to /dashboard | ⬜ |
| 6 | Wrong password | Error shown | ⬜ |
| 7 | Unauthenticated visit to /dashboard | Redirected to /auth/login | ⬜ |

#### Setup Wizard
| # | Test | Expected | Result |
|---|------|----------|--------|
| 8 | Complete all 4 steps | Project + phases created in DB | ⬜ |
| 9 | Custom project name | Shows correctly on dashboard | ⬜ |
| 10 | Add/remove phase in Step 2 | Phase list updates correctly | ⬜ |
| 11 | Add/remove deliverable in Step 2 | Chip appears/disappears | ⬜ |
| 12 | Toggle off a tab in Step 3 | Tab hidden in BottomNav | ⬜ |
| 13 | Toggle off a QuickAdd option | Option hidden in FAB menu | ⬜ |

#### Data Isolation
| # | Test | Expected | Result |
|---|------|----------|--------|
| 14 | User A logs in — sees only their project | No data from User B | ⬜ |
| 15 | User B logs in — sees only their project | No data from User A | ⬜ |
| 16 | Vasudha logs in (existing data) | Sees her existing project data | ⬜ |

#### Core Features (regression)
| # | Test | Expected | Result |
|---|------|----------|--------|
| 17 | Log daily work via QuickAdd | Entry appears in Tracker → Logs | ⬜ |
| 18 | Add expense via QuickAdd | Updates budget item | ⬜ |
| 19 | Add funds via QuickAdd | Appears in Finances → Funds | ⬜ |
| 20 | Photo upload in Log Work | Photo visible in log | ⬜ |
| 21 | Export CSV | CSV downloads correctly | ⬜ |
| 22 | Google Drive backup | JSON file appears in Drive | ⬜ |

### Known Limits
- Vasudha's existing rows need manual backfill after first login (see migration comments)
- Google Drive backup requires NEXT_PUBLIC_GOOGLE_CLIENT_ID env var to be set

### Bugs Found
_(fill in after testing)_
