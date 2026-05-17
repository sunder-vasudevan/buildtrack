# BuildTrack — Help Guide

> Mobile-first construction project tracker. Log daily progress, track budget, manage phases and deliverables.

---

## Getting Started

### New User
1. You'll receive an invite email from the admin
2. Click the link → set your password → you're in
3. The setup wizard walks you through:
   - **Step 1:** Project name, location, budget, dates
   - **Step 2:** Phases & deliverables (customise the 6 default phases or build your own)
   - **Step 3:** App preferences — hide tabs or QuickAdd options you don't need
   - **Step 4:** Review & create

### Returning User
Go to [buildtrackapp.vercel.app](https://buildtrackapp.vercel.app) → enter email + password → you're in.

---

## Navigation

| Tab | What it's for |
|-----|--------------|
| **Overview** | Dashboard: budget summary, net cash balance, recent logs, active reminders |
| **Tracker** | Phases, daily logs, uploaded plans |
| **Finances** | Budget items + funds received |
| **Project Info** | Project details, team, windows, exports, invite users |

The **+ FAB** (centre bottom) opens Quick Add.

---

## Quick Add (FAB)

| Option | What it does |
|--------|-------------|
| Add Works Completed | Log daily site progress with photos, weather, phase & deliverable |
| Add Expense / Receipt | Record a payment against a budget item |
| Add Funds | Record money received (loan, personal contribution, etc.) |
| Reminder / Followup | Set a reminder with a due date |
| Wishlist / Pending Work | Add backlog items or future desires |
| Project Jotting / Note | Quick freeform note |

You can hide any of these from **Project Info → Settings → Preferences**.

---

## Phases & Deliverables

- Phases are the main build stages (e.g. Foundation, Walls, Finishes)
- Each phase has deliverables — specific tasks to complete
- When you log daily work, link it to a phase + deliverable
- A deliverable turns green when marked complete (actual_due set), red if overdue

---

## Budget & Finances

- **Budget tab:** All budget items by category. Shows quoted vs actual cost.
- **Funds tab:** All capital received. Source, amount, date.
- **Net Cash Balance** on dashboard = Total funds received − Total expenses paid

---

## Exports

In **Project Info → Exports**:
- Expenses CSV
- Funds CSV
- Status report
- Daily logs

---

## Backup to Google Drive

In **Project Info → Backup**:
- Click "Backup to Google Drive"
- Authorise once with your Google account
- Full project JSON snapshot saved to your Drive

---

## Inviting Users (Admin only)

In **Project Info → Invite User**:
- Enter the new user's email
- They receive an invite email to set up their account
- Their project data is completely separate from yours

---

## Data & Privacy

- Each user's data is isolated — no one else can see your project
- No passwords stored by BuildTrack — handled by Supabase Auth
- Photos stored in Supabase Storage (private bucket)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't log in | Check email, request new invite from admin |
| Photos not uploading | Check internet connection; max file size 10MB |
| Data not showing | Refresh the page |
| Wrong project | Contact admin to be re-invited |

---

## Version History

| Version | Date | What shipped |
|---------|------|-------------|
| v1.0.0 | 2026-05-17 | Multi-user auth, invite flow, setup wizard, preferences, Google Drive backup |
| v0.5.0 | 2026-05-12 | Financial summary dashboard, Net Cash Balance, reminders widget, lazy exports |
| v0.4.0 | 2026-05-11 | QuickAdd FAB, log photos, deliverables JSONB, storage RLS fix |
