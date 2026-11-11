# 01 · Project scope and baseline

**Project:** Dr. Tebeila Dental Practice Strategic Action Plan Tracker, visual redesign on the existing product.
**Branch:** `redesign/executive-glass-ui` · **Baseline / rollback point:** commit `ea552b8` on `main` (local tag `baseline-pre-glass-redesign`).
**Authorised scope:** isolated design work on a branch. Not authorised: pushing to `main`, publishing, changing live records or integrations.

## What the product is
- One self-contained HTML file. `index.html` and `DrTebeila_ActionPlan_Tracker.html` are identical copies. No build step, no framework.
- Hosted by GitHub Pages: `.github/workflows/static.yml` publishes the **whole repository root** on every push to `main`.
- External libraries from CDNs: Supabase client (jsDelivr) and Lucide icons (`unpkg.com/lucide@latest`, not version-pinned), plus the Outfit font from Google Fonts.

## Where the data lives
| Data | Location |
|---|---|
| The 16 goals, owners, areas, short / medium / long steps and due dates | Hard-coded in the page (`INIT_DATA`) |
| Priorities, "waiting on", decision owners, leadership actions, bottlenecks, strategic health | Hard-coded in the page (`EXECUTIVE_CONTEXT`) |
| Status, notes, accountability fields, last-updated time per goal | Supabase table `dr_tracking` (one row per goal), mirrored in browser storage key `dr_tebeila_app_v2` |

## Feature inventory (all preserved)
- **Views:** Overview, Ownership Board, Goals, Timeline, All Notes.
- **Overview:** Today's Focus, four metrics (Active Goals, Achieved, Reporting Gaps, Action Needed), progress by area, status breakdown, Project Narrative, Leadership Actions Required, Executive Bottlenecks, Strategic Health Snapshot, O.C.E Programme Roadmap, usage guidance, gallery, CSV and text export.
- **Ownership Board:** four filters (programme, area, status, owner with partial match), sort on eight columns, inline status change, row opens the goal, phone card layout, eight-status summary strip.
- **Goals:** three filters, expand / collapse, eight status buttons, accountability form (Strategy / North Star, Responsible Person with "Other", Reason for Delay and Corrective Action when overdue, Achieved Date and Success Evidence when completed), team and coach notes with filter, edit and delete.
- **Timeline:** one bar per goal on an April 2026 to April 2027 scale, coloured by status, click opens the goal.
- **Persistence:** save to browser storage, upsert to Supabase, live updates through a realtime subscription, sync indicator, toasts.
- **O.C.E:** Phase 1 marked active and tracked as goals 11–16; later phases listed as context only.

## Gate-0 findings
No finding blocked the design work. Each one below is a decision for the owner.

### Defects found in the baseline
| # | Finding | Evidence | What this branch does |
|---|---|---|---|
| 1 | **Goals never fully collapse.** A stray `</div>` closes the collapsible area early, so the accountability form and controls show on every goal even when "closed" (each closed goal is about 650px tall). | DOM probe in Phase 0 | Fixed: goals now collapse to their header. |
| 2 | **The short / medium / long step boxes are missing.** The archived version (`ARCHIVE_DrTebeila_V1.html`) shows them inside each goal; the current version lost that block, yet still says "Focus on the current phase below". The step text is not visible anywhere in the app. | Archive comparison | Restored from the archive, restyled. |
| 3 | **Timeline bars end about one month late.** A goal due 8 June is drawn to about 8 July. | Width calculation adds an extra month | Fixed: bars and markers are placed by exact date. |
| 4 | **Sideways page scroll on phones** (13px at 390px wide, 28px at 360px). | Baseline test run | Fixed. |
| 5 | **If the icon CDN is unreachable the Overview stops rendering part-way**, because one call to the icon library is unguarded. | Code read | Fixed: guarded. Navigation icons are now inline and never depend on the CDN. |

### Contradictions in the baseline (left as they are)
- **Two sets of status wording.** Buttons and badges say "Action Needed / Escalate to Coach / Completed / On Hold". The Goals legend and the filter menus say "Needs Attention / In Jeopardy / Achieved / Postponed". Both are kept exactly where they were. New elements use the button wording.
- **Plan start.** The header says 27 March 2026; the Timeline says "Project Start (Apr 2026)". Both kept.

### Honesty of notification wording
The app shows "your coach has been notified" and "your coach receives a notification", but no notification is sent: the code only writes to the browser console. This branch rewords those two lines so they no longer claim delivery. The behaviour is unchanged.

### Who can comment and who can edit (as built today)
The page has no sign-in and no roles, in the live version or the archived one.
- Anyone who opens the page can change any status, fill in any accountability field, and add, edit or delete any note.
- A note stores three things: its text, a date, and a type ("team" or "coach"). The type comes from the filter the person has selected when saving, not from who they are. No author is recorded.
- Each save sends the goal's whole row (status, all notes, accountability fields, time). If two people add notes to the same goal at nearly the same moment, the later save can overwrite the earlier one.
- If rules exist about who may write, they can only be in the Supabase table's access policies, which are not visible from the code.

This redesign does not change any of the above.

### Security and privacy observations (not changed, owner decision)
- **No sign-in.** Anyone with the page link can open the tracker. Whether they can also change records depends on the Supabase access rules for `dr_tracking`, which could not be inspected from the code.
- **Notes are inserted into the page without escaping.** Combined with an open table, a crafted note could run script in other users' browsers. Recommend escaping in a separate, accepted change.
- **The whole repository is published.** The strategic action plan PDFs and Word file in the repository root are reachable from the public site, and anything merged under `docs/` and `qa/` would be too.
- **A personal email address is hard-coded** in the page source as the notification address, and is therefore public.
- **Unpinned icon library** (`lucide@latest`) can change without notice.

### Handoff package
Received: the master prompt and the approved design image. Not received: `02_Inspirations/`, the playbook document, and `04_Implementation/` (reference lock, token brief, acceptance checklist). The reference lock and tokens in this folder were therefore derived from the approved image and the master prompt alone.
