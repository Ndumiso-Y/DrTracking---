# 07 · Usability audit

Requested by the owner before release: is the tracker easy to use, with the most-used controls closest to hand?

**Principles applied**
- **Driver-oriented layout** (BMW's term is the "driver-oriented cockpit"): what is used most sits nearest and largest. In interface design this is **Fitts's Law**.
- **Low cognitive load:** plain words, one obvious next step, nothing to remember.
- **Progressive disclosure:** essentials first, detail one click away.

## Measured before the fixes
| Finding | Measurement |
|---|---|
| Small text | 392 text elements at 11px or smaller, 18 of them at 9px |
| Small controls | Edit and delete note buttons 28 × 28px; note filter chips 32px; status pills 29px; theme buttons 32px |
| Phone navigation | At the top of the screen, 2 of 5 views visible without sideways scrolling |
| Long Overview | 3.7 screens on a laptop, 8.1 screens on a phone |
| All Notes order | Labelled "newest first" in the code, but actually listed in reverse goal order, so a new note could sit far down the page |
| Opening a goal from another view | The goal opened but the page did not move to it, so it could be off-screen |
| Two buttons both called "Save" inside one goal | One saves the accountability details, the other adds a note |
| Greeting | Time-of-day greeting with a waving-hand emoji; the owner felt it looked machine-made |

## Fixed in this round (display and ease of use only; data handling unchanged)
| Fix | Result |
|---|---|
| Minimum text size raised | Smallest label is now 12px (11px only inside three tiny tags); nothing under 10px |
| Larger controls | Every button, menu and field is at least 44px on touch screens; 36–40px with a mouse |
| Phone navigation moved to a bar at the bottom | All five views visible at once, under the thumb, each 54px tall |
| All Notes sorted by the date on each note | Truly newest first; undated notes keep their old place after the dated ones |
| Opening a goal from Overview, Timeline, Board or All Notes | The page scrolls to that goal; switching view starts at the top |
| Distinct button names | "Save details" and "Add note" |
| Greeting replaced | Today's date in small capitals above the title; no emoji |
| Emoji and text glyphs replaced with drawn icons | Empty state, edit and delete |
| Plan dates no longer look like a button | Shown as plain information; only real controls look like controls |
| Least-used sections folded | "How to use this tracker" and the gallery open with one click |
| Hover explanations on the four metric cards | Each says in plain words what it counts |
| Icons after filtering | Icons inside goals now appear after a filter change too |

## Recommended, not done (each needs an owner decision)
| # | Recommendation | Why it is not done |
|---|---|---|
| 1 | **One set of status words.** Buttons say "Action Needed / Escalate to Coach / Completed / On Hold"; the legend and filters say "Needs Attention / In Jeopardy / Achieved / Postponed". This is the single biggest source of confusion. | Business wording |
| 2 | **Choose the note type openly.** A note is saved as Team or Coach depending on which filter chip is selected, which is easy to miss. A visible "Team / Coach" choice beside the note box would be clearer. | Changes how notes are entered |
| 3 | **Undo after a status change.** One click changes a status immediately. An "Undo" in the confirmation message would protect against slips. | New behaviour |
| 4 | **Replace the browser pop-up used to edit a note** with an in-page editor. | New behaviour |
| 5 | **Make the metric cards shortcuts** (for example "Action Needed" opens those goals). | New behaviour |
| 6 | **Explain the terms once:** P1 / P2, O.C.E, "Reporting Gaps", "Strategy / North Star". | Needs the owner's wording |
| 7 | **Search and filters on All Notes.** | New feature |
| 8 | **Who wrote each note.** Notes carry no author because there is no sign-in. | Needs sign-in |

## Verdict
A new user can now find where to act, open a goal, change its status and add a note without instruction, on a laptop or a phone. The remaining friction is wording (items 1, 2 and 6), which is the owner's to settle.
