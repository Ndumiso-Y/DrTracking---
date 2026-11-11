# 05 · Visual diff log

Compared in a real browser (Chromium via Playwright) at 1672 × 941, the size of the approved image, and at 1440, 1024, 768 and 390 wide. Evidence: `qa/screenshots/before/` and `qa/screenshots/after/`.

## Capture → fix passes (three, the allowed maximum)
| Pass | Three worst mismatches | Fix |
|---|---|---|
| 1 | Four panels across were too cramped at 1440 and titles wrapped. Timeline bars carried truncated titles. Page background stopped after the first screen. | Three-column overview with a full-height action rail (four columns from 1560px). Titles moved to the label column; bars carry owner badges as in the reference. Background made continuous. |
| 2 | Action rail left a gap beside the area panel. Status legend wrapped below the ring. Tooth art sat under the utility bar and read as a blob. | Area panel spans the full row. Ring and legend resized to sit side by side. Tooth repositioned and reshaped. |
| 3 | Legend labels wrapped at 1440. Board goal column too narrow and owner pills wrapped badly. Phone navigation hid the active item. | Column ratios rebalanced. Goal column widened, number badge aligned beside the title. Active item scrolls into view, with a fade hint at the edge. |

## Remaining differences from the approved image
| Area | Approved image | This build | Reason |
|---|---|---|---|
| Metric row | Total Goals, On Track, In Progress, Overdue | Active Goals, Achieved, Reporting Gaps, Action Needed | These are the tracker's existing four metrics. Changing them is a business decision, not a styling one. "In Progress" is not a status in this tracker. |
| Metric trend ("+6% vs. last month") and sparklines | Shown | Replaced by a proportion meter | No history is stored, so a trend would be invented. The meter shows share of goals. |
| Goal Activity chart | Completed vs. created over time | Not built | No history is stored. |
| Today's Tasks panel and "New Task" | Shown | Not built. The slot holds Leadership Actions Required (real, existing content). | The tracker has no task data or task feature. |
| Search bar, notification bell, user menu | Shown | Not built | No such features exist. Dead controls were not added. |
| Date range selector | Dropdown | Plain pill showing plan start and horizons | The existing header text, shown honestly as information. |
| Calendar, Reports, Settings in the sidebar | Shown | Not built | No such views exist. |
| Photos and avatars | Faces on bars and tasks, user photo | Initials from real owner names; monogram for the practice lead | No fictional or unverified photos. |
| Timeline "Progress %" column | Shown | Status shown instead | No percentage progress is stored per goal. |
| Sidebar plan progress | "68%" | Real share of goals completed | Calculated from state. |
| Sidebar lead role | "Practice Lead" | "Coachee" | Existing wording. |
| Status ring | Four groups | All eight existing statuses | Statuses were not merged or renamed. |
| Status ring at 1560px and wider | Ring beside legend | Ring above legend | Column is narrower in the four-column layout. |
| Timeline density | Bars span several months | Bars are short | Real dates: every current goal ends in June or July 2026 on a 13-month scale. |
| Tooth art | Glossy 3D render | Flat, soft-shaded SVG illustration | No licensed render was supplied. An original illustration was drawn instead of a made-up photo. |

## Changes that go beyond styling (each needs owner acceptance)
| Change | Type | Why |
|---|---|---|
| Goals collapse fully when closed | Bug fix | A stray tag kept every form open. |
| Short / medium / long step boxes restored inside each goal | Regression fix | Present in the archived version, lost in the current one. |
| Timeline bars and markers placed by exact date; due-date markers and a today line added | Bug fix + truthful detail | Bars ended about a month late. |
| Status ring legend lists Cancelled and Discontinued too | Presentation | So the ring always adds up to the total. |
| Two notification sentences reworded | Wording | Nothing is actually sent. |
| Section headings: "Goals by Status" (was "Your Weekly Health Check", kept as the subtitle); guidance card titled "How to use this tracker" (was the blue "Welcome" banner) | Wording | To match the approved image. All body text is unchanged. |
| Overview timeline preview | New view of existing data | Uses the same renderer and dates as the Timeline. |
| Keyboard support (Enter / Space on goals, focus items, bars, status menu) and labels on inputs | Accessibility | Mouse behaviour is unchanged. |
