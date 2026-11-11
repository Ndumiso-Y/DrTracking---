# 03 · Design tokens

All tokens are CSS custom properties on `:root` at the top of the stylesheet in `index.html`. Values were sampled from the approved image and then adjusted where needed to reach readable contrast.

## Colour
| Token | Value | Use |
|---|---|---|
| `--ink` | `#1B2430` | Headings, numbers, primary text |
| `--ink-2` | `#344054` | Secondary text, icons |
| `--muted` | `#556170` | Supporting text (5.8:1 on cards) |
| `--faint` | `#667085` | Tertiary text (4.6:1 on cards) |
| `--bg-0` / `--bg-1` / `--bg-2` | `#DCE4EC` / `#E8EDF3` / `#F3F6F9` | Page atmosphere |
| `--glass` | `rgba(255,255,255,.66)` | Cards and panels |
| `--glass-strong` | `rgba(255,255,255,.84)` | Inputs, pills, nested cards |
| `--glass-soft` | `rgba(255,255,255,.44)` | Sidebar, quiet areas |
| `--glass-inset` | `rgba(241,245,249,.72)` | Wells inside cards |
| `--glass-border` | `rgba(255,255,255,.9)` | Card edge highlight |
| `--hairline` / `--hairline-strong` | `rgba(27,36,48,.08)` / `.14` | Dividers, input borders |
| `--accent` / `--accent-ink` / `--accent-soft` | `#2F6B4A` / `#1F4D35` / `#E2EEE7` | Focus ring, active phase, positive emphasis |
| `--slate` / `--slate-soft` | `#6F86AD` / `#E3E9F3` | Neutral bars, programme tags |

## Status colours
The eight statuses and their keys are unchanged. Hues are kept; tones were deepened so status text passes 4.5:1 on its own tint.

| Status key | Label (unchanged) | Colour | Tint | Contrast |
|---|---|---|---|---|
| `G` | On Track | `#256B43` | `#E1F0E7` | 5.5:1 |
| `R` | Escalate to Coach | `#B93230` | `#FBE6E5` | 4.9:1 |
| `A` | Action Needed | `#8A5A0F` | `#FBF0D9` | 5.2:1 |
| `B` | Completed | `#265FA0` | `#E2ECF8` | 5.5:1 |
| `P` | On Hold | `#6344B5` | `#ECE6F9` | 5.7:1 |
| `Grey` | Not Started | `#4E5968` | `#E9EDF2` | 6.1:1 |
| `C` | Cancelled | `#364152` | `#E3E7EC` | 8.3:1 |
| `D` | Discontinued | `#5F6A7E` | `#F1F3F6` | 4.9:1 |

## Type
Outfit, weights 400 / 500 / 600. Scale: 11 · 12.5 · 14 (base) · 15 · 17 · 22 · 30 (page title) · 34 (metric). Titles use −0.02em tracking. Small caps labels use 11px, 600, +0.07em.

## Shape, depth, spacing
| Token | Value |
|---|---|
| `--r-sm` / `--r-md` / `--r-lg` / `--r-pill` | 10 / 14 / 20 / 999px |
| `--shadow-1` | `0 1px 2px rgba(16,24,40,.04), 0 10px 28px -14px rgba(16,24,40,.16)` |
| `--shadow-2` | `0 2px 6px rgba(16,24,40,.05), 0 22px 48px -20px rgba(16,24,40,.26)` |
| `--blur` | `blur(20px) saturate(135%)` |
| Spacing | 4 · 8 · 12 · 16 · 20 · 24 · 32px |
| `--sidebar-w` | 248px (212px from 1100px down; top bar from 860px down) |

## Glass rules
- Cards use `--glass` with `backdrop-filter`. Where the browser has no `backdrop-filter`, surfaces fall back to 94% white.
- Text never sits on a surface lighter than 44% white without a card behind it.
- Only two shadow levels. Hover raises a card from level 1 to level 2; nothing else gains a shadow.

## Motion
View fade 0.32s, goal expand 0.3s, hover transitions 0.16s. All removed under `prefers-reduced-motion`.

## Breakpoints
1560px (four-column overview) · 1100px (narrow sidebar, two-column grids) · 860px (sidebar becomes a top bar, board switches to cards) · 560px (single column).

## Legacy names
The script's templates still use the old variable names (`--primary-blue`, `--text-muted`, `--border-color` and others). They are kept as aliases that point at the tokens above.
