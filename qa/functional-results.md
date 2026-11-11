# Functional test results

Run on 2026-11-11 with Playwright (Chromium), synthetic data from `qa/fixtures/synthetic-state.json`, in local mode.
Every run blocks the live database and its client library, so no practice record was read or changed.

| Suite | Baseline (`ea552b8`) | Redesign |
|---|---|---|
| Functional regression (`qa/regression.js`) | 60/62 passed | 62/62 passed |
| Accessibility and resilience (`qa/a11y.js`) | not run (new checks) | 18/18 passed |
| Logic unchanged (`qa/compare-logic.js`) | n/a | 45/45 unchanged |

The redesign was run six times in a row with the same result. The two baseline failures are pre-existing: the old layout scrolled sideways by 13px at 390px wide and 28px at 360px wide. The redesign fixes both.

## How to run

```bash
node qa/regression.js
node qa/a11y.js
node qa/compare-logic.js
node qa/capture.js after
```

Needs Node and Playwright with Chromium. If your network blocks unpkg.com, set `LUCIDE_LOCAL` to a local copy of `lucide.min.js` so icons load.

## Functional regression: redesign

```
PASS  page loads with no script errors
PASS  view "dashboard" opens and is the only visible view
PASS  view "projects" opens and is the only visible view
PASS  view "milestones" opens and is the only visible view
PASS  view "timeline" opens and is the only visible view
PASS  view "notes" opens and is the only visible view
PASS  navigation highlights the current view
PASS  overdue badges match state
PASS  metric row: Active Goals from state
PASS  metric row: Achieved from state
PASS  metric row: Reporting Gaps from state
PASS  metric row: Action Needed from state
PASS  Today's Focus lists up to 3 real goals
PASS  O.C.E roadmap present, Phase 1 marked active, later phases listed
PASS  O.C.E Phase One goals are 11–16
PASS  narrative, leadership actions, bottlenecks, strategic health all render
PASS  progress by area and status breakdown render
PASS  clicking a focus item opens that goal
PASS  export CSV downloads with all goals
PASS  export TXT downloads with all goals
PASS  export buttons are present on the page
PASS  board lists every goal
PASS  board programme filter
PASS  board area filter
PASS  board status filter
PASS  board owner filter (partial owner match)
PASS  board sorts by column both ways
PASS  board summary strip counts all 8 statuses
PASS  board inline status menu opens
PASS  status menu offers all 8 existing status labels
PASS  board inline status change is saved
PASS  clicking a board row opens the goal
PASS  goals view lists every goal
PASS  goals programme filter
PASS  goals area filter
PASS  goals status filter
PASS  goals empty state when nothing matches
PASS  goal expands on click and its form is visible
PASS  overdue goal shows Reason for Delay and Corrective Action
PASS  "Other" responsible person reveals free-text field
PASS  accountability form saves all fields
PASS  goal offers all 8 status buttons
PASS  status button saves and goal stays open
PASS  completed goal shows Achieved Date and Success Evidence
PASS  team and coach notes are saved with the right type
PASS  coach note filter shows only coach notes
PASS  note edit saves and is marked edited
PASS  note delete removes one note
PASS  timeline has one bar per goal
PASS  timeline bars are positioned from real due dates
PASS  timeline shows the month scale
PASS  clicking a timeline bar opens the goal
PASS  all notes lists every saved note
PASS  state survives a reload (local storage key unchanged)
PASS  sync indicator present and reports local mode
PASS  no request was made to the live database
PASS  no script errors during the whole run
PASS  no horizontal page overflow at 1440px
PASS  no horizontal page overflow at 1024px
PASS  no horizontal page overflow at 768px
PASS  no horizontal page overflow at 390px
PASS  no horizontal page overflow at 360px

62/62 passed
```

## Functional regression: baseline

```
FAIL  no horizontal page overflow at 390px  -> 13px
FAIL  no horizontal page overflow at 360px  -> 28px
60/62 passed
```

## Accessibility and resilience: redesign

```
PASS  Tab lands on the first navigation button with a visible focus ring
PASS  Enter on a navigation button switches view (Goals)
PASS  Enter expands a goal and aria-expanded follows
PASS  Space collapses it again
PASS  a collapsed goal hides its form from view
PASS  Enter on a Today's Focus item opens the goal
PASS  Enter on a timeline bar opens the goal
PASS  Enter opens the board status menu
PASS  every select, input and textarea has a label or accessible name
PASS  exactly one h1 is visible per view
PASS  timeline: every bar end and due-date marker sits at its true calendar position
PASS  timeline: 13-month scale kept (Apr 2026 to Apr 2027) and the today marker is at the real date
PASS  timeline on a phone: scrolls sideways inside its own frame, goal names stay pinned, frame is keyboard-focusable
PASS  phone navigation keeps the active item on screen
PASS  phone navigation targets are at least 40px tall
PASS  reduced-motion setting removes transitions and animations
PASS  with the icon library blocked, the overview still renders fully and navigation keeps its icons
PASS  fresh browser: honest empty states (no notes, 0 achieved, 0%)

18/18 passed
```

## Logic comparison: redesign vs baseline

```
IDENTICAL  const STATUS_MAP
IDENTICAL  const META_KEYS
IDENTICAL  const META_ALIASES
IDENTICAL  function getMetaValue
IDENTICAL  const INIT_DATA =
IDENTICAL  const EXECUTIVE_CONTEXT
IDENTICAL  function getResponsiblePeopleOptions
IDENTICAL  async function loadState
IDENTICAL  function subscribeToChanges
IDENTICAL  function saveLocalState
IDENTICAL  async function saveState
IDENTICAL  function showToast
IDENTICAL  function setSyncStatus
IDENTICAL  function cycleStatus
IDENTICAL  function updateMilestone
IDENTICAL  function updateAccountability
IDENTICAL  function updateAccountabilityBatch
IDENTICAL  function getNoteType
IDENTICAL  function getNoteTypeMeta
IDENTICAL  function toggleResponsibleOther
IDENTICAL  function saveAccountabilityForm
IDENTICAL  function addComment
IDENTICAL  function editComment
IDENTICAL  function deleteComment
IDENTICAL  function updateTabBadge
IDENTICAL  function parseLocalDate
IDENTICAL  function calcDays
IDENTICAL  function formatDate
IDENTICAL  function getCountdownBadge
IDENTICAL  function getExecutiveContext
IDENTICAL  function executivePriorityBadgesHTML
IDENTICAL  function dependencyBadgesHTML
IDENTICAL  function renderExecutiveDashboardSections
IDENTICAL  function getPriorityRank
IDENTICAL  function priorityBadgeHTML
IDENTICAL  function formatLastUpdated
IDENTICAL  function obOpenStatusMenu
IDENTICAL  function obSetStatus
IDENTICAL  function sortProjects
IDENTICAL  function setNoteFilter
IDENTICAL  function triggerAddComment
IDENTICAL  function refreshUI
IDENTICAL  function exportData
IDENTICAL  function initApp
IDENTICAL  cloud configuration lines

45/45 unchanged
```

## Not covered by automated tests

- **Cloud sync against the real database.** Deliberately not exercised. The sync code is byte-identical to the baseline (see the comparison above), but it has not been run against Supabase in this work.
- **Safari, Firefox and real phones.** Only Chromium was used. Glass blur has a solid fallback for browsers without `backdrop-filter`, which was not visually checked.
- **Screen reader behaviour.** Names, roles and keyboard paths were checked; no screen reader was run.
- **Practice and team photos.** Blocked in every capture to keep people out of the evidence, so the gallery was only checked for layout.
