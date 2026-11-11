# 03 · Design tokens

All tokens are CSS custom properties at the top of the stylesheet in `index.html`. The default values are the **Light** theme. The other two themes override tokens under `:root[data-theme="…"]`.

## Themes
| Switch label | Internal name | Character | When it applies |
|---|---|---|---|
| **Light** | `aurora` | Colourful glass on a soft blue, mint and lavender background, in the practice's blue and green | Default |
| **Dark** | `midnight` | Navy sidebar, navy-to-emerald banner on the Overview, crisp white cards | Chosen in the switch |
| **High contrast** | `contrast` | Solid dark surfaces, larger text, strong borders, no transparency or glow, thick yellow focus ring | Chosen in the switch; meant for low vision |

The choice is a display preference only. It is stored per browser under the key `dr_tebeila_theme`, separate from tracker data, and is never sent to the database.

## Colour roles (Light values)
| Token | Value | Use |
|---|---|---|
| `--ink` / `--ink-2` | `#0F1B2D` / `#2B3A52` | Headings and numbers / secondary text |
| `--muted` / `--faint` | `#4F5D75` / `#5F6E87` | Supporting / tertiary text |
| `--on-ink` | `#FFFFFF` | Text on an `--ink` fill |
| `--glass`, `--glass-strong`, `--glass-soft`, `--glass-inset` | white at 72%, 93%, 52%; `rgba(244,248,253,.82)` | Cards, inputs, quiet areas, wells |
| `--surface-solid`, `--surface-head`, `--surface-stick`, `--hover` | opaque and near-opaque whites | Menus, table and timeline headers, pinned column, hover |
| `--accent` / `--accent-ink` / `--accent-soft` | `#0081C6` / `#005F94` / `#DDF1FB` | Practice blue: icons, focus ring, tints |
| `--accent-grad` + `--on-accent` | `#006BA6 → #007F8C → #00854A`, white text | Active navigation, primary buttons, plan meter, today flag |
| `--slate`, `--slate-soft`, `--slate-ink` | `#2E90FA`, `#E3EEFD`, `#1D4E9E` | Programme tags, guidance |
| `--warm-ink`, `--warm-soft`, `--warm-line` | `#9A3F0E`, `#FFF3E8` | "Waiting on" and decision notes |
| `--alert-grad` | `#D92D20 → #B42318`, white text | P1, overdue, count badges |
| `--warn-grad` + `--warn-on` | `#FEC84B → #FDB022`, text `#6A2A07` | P2 |
| `--m1a…--m4b` | blue, green, red, amber pairs | The four metric cards |
| `--page-bg` | six soft radial colour fields | Page atmosphere |

## Status colours
The eight statuses and their keys are unchanged. Each status now has three tokens: `-color` for fills (ring, bars, dots), `-ink` for text, `-bg` for the tint behind text.

| Key | Label (unchanged) | Fill | Text | Tint |
|---|---|---|---|---|
| `G` | On Track | `#12B76A` | `#067647` | `#D7F5E5` |
| `R` | Escalate to Coach | `#F04438` | `#B42318` | `#FEE4E2` |
| `A` | Action Needed | `#F79009` | `#A8450B` | `#FEF0C7` |
| `B` | Completed | `#2E90FA` | `#175CD3` | `#DCEBFF` |
| `P` | On Hold | `#7A5AF8` | `#5925DC` | `#EBE9FE` |
| `Grey` | Not Started | `#8492A6` | `#475467` | `#EAEEF4` |
| `C` | Cancelled | `#475467` | `#344054` | `#E4E7EC` |
| `D` | Discontinued | `#B6BFCC` | `#56637A` | `#F2F4F7` |

The script still writes `var(--status-x-color)` onto pills and labels. A scoped rule remaps that variable to the `-ink` shade inside text elements, so the script did not have to change.

## Contrast
Measured in the browser by `qa/themes.js` on every visible text element in every view, against the colour actually behind it (including the worst stop of any gradient):
- Light and Dark: at least 4.5:1 (3:1 for large text).
- High contrast: at least 7:1 (4.5:1 for large text).

## Type
Outfit, weights 400 / 500 / 600. Scale: 11 · 12.5 · 14 (base) · 15 · 17 · 22 · 30 · 36 (Overview title) · 42 (metric). High contrast raises the small sizes to 13 · 14.5 · 16 · 17 · 19.

## Shape, depth, spacing
| Token | Value |
|---|---|
| `--r-sm` / `--r-md` / `--r-lg` / `--r-pill` | 10 / 14 / 20 / 999px |
| `--shadow-1` / `--shadow-2` | Blue-tinted soft shadows in Light; neutral in Dark; none in High contrast |
| `--blur` | `blur(20px) saturate(140%)` in Light; off in Dark and High contrast |
| Spacing | 4 · 8 · 12 · 16 · 20 · 24 · 32px |
| `--sidebar-w` | 248px (212px from 1100px down; top bar from 860px down) |

## Motion
View fade 0.32s, goal expand 0.3s, hover transitions 0.16s. All removed under `prefers-reduced-motion`.

## Breakpoints
1560px (four-column overview) · 1100px (narrow sidebar, two-column grids, theme switch shows icons only) · 860px (sidebar becomes a top bar, board switches to cards) · 560px (single column).

## Legacy names
The script's templates still use the old variable names (`--primary-blue`, `--text-muted`, `--border-color` and others). They are kept as aliases that point at the tokens above.
