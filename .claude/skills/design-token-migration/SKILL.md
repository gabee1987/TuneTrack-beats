---
name: design-token-migration
description: Replace hard-coded colours, spacing, radii or z-index literals in one CSS Module with design tokens and shrink the guard allowlist (noHardcodedColors ratchet). Use when touching a file listed in PENDING_MIGRATION, when a review flags a literal, or when working design-system plan 15 Phase 3 or plan 14 Phase 1.
---

# design-token-migration

Normative: `docs/rules/design_system.md` §2–§4, §6; work breakdown
`docs/plans/2026-10-project-review/15-design-system-consolidation.md` §4 (colours, spacing)
and `14-navigation-and-overlays.md` §2 (z-index). One file per task; worst first.

## 1. Pick the file

The allowlist in `apps/web/src/test/guards/noHardcodedColors.test.ts` (`PENDING_MIGRATION`,
20 files on 2026-10-06) is the queue. Hex counts per file are in plan 15 §4.1. Take one file,
finish it, remove it from the list. Never add a file to any allowlist.

## 2. Find the literals

```
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|[0-9]+px|z-index" apps/web/src/<file>.module.css
```

## 3. Map each literal — three colour categories (plan 15 §4.1)

| Literal looks like                                      | Treatment                                                                                                                                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spotify green `#1ed760`, `#1db954`, on-colour `#06100a` | brand token identical in both themes: `--color-brand-spotify`, `--color-brand-spotify-on` (add if missing)                                                                         |
| Danger/success shades (`#dc2626`, `#ef4444`, `#4ade80`) | existing semantic token (`--color-danger`, `--color-success`, `--color-warning`); add a semantic token if the shade is truly new                                                   |
| Playful accents (`#ff8a3d`, `#8b5cff`, `#ff9daf`)       | accent ramp token (`--color-accent-warm`, `--color-accent-violet`, `--color-accent-rose`, …)                                                                                       |
| `#fff` / `#000` inside `color-mix(...)`                 | `--color-mix-light` / `--color-mix-dark`                                                                                                                                           |
| raw px spacing / radius                                 | `--space-*` / `--radius-*` at that value; round to the nearest token; new token only at 3+ uses                                                                                    |
| raw `z-index: 1200`                                     | `--z-*` scale token from `globals.css` (`base, sticky, nav, overlay, sheet, hint, dialog, toast`; `celebration` only in `zIndexPrimitives`, see plan 14 §2.1); never a new literal |

Permitted literals are listed in `design_system.md` §4 ("The two permitted literal-colour
cases") and §6 ("The one permitted literal"). Anything else is a defect.

## 4. Where tokens are defined

- Semantic colours: `apps/web/src/features/theme/darkThemeTokens.ts` (canonical) **and**
  `lightThemeTokens.ts`. The `SemanticColorTokens` type forces the same keys in both;
  `themeTokens.test.ts` checks it.
- Primitives (spacing, radius, z-index, type, motion): `features/theme/tokens/primitives.ts`.
- Component tokens (`button-primary-bg`, `card-radius`, `input-min-height`, …):
  `features/theme/tokens/components.ts`, resolved to semantic vars; the
  `primitives.contract.test.ts` asserts a few of them.
- Legacy aliases `--radius-card/panel/input/button` in `app/styles/globals.css` are being
  retired; prefer the scale token and remove an alias once no module references it.

## 5. Keep behaviour identical

- Visual parity is the acceptance: same computed colour in dark theme. If a shade genuinely
  changes, say so in the report; do not "improve" colours while migrating.
- Do not restructure selectors, rename classes or split the module in the same change unless
  the file is over 300 lines (then split first, migrate second, two reports).
- Dark theme first; the light theme gets the same key with its own value.

## 6. Finish

1. Remove the file from `PENDING_MIGRATION`; the guard's second test fails if you forget.
2. `npx vitest run --config apps/web/vitest.config.ts apps/web/src/test/guards` then
   `/verify` for `@tunetrack/web`.
3. Check the component on `/dev/ui` or its page in both themes if the change touched a
   primitive.
4. `/plan-status`: update the hex count table in plan 15 §4.1 (or the z-index inventory in
   plan 14 §2.2) and the `00-index.md` §8 row.
