# TuneTrack Design System — Normative Contract

> **Status:** authoritative. Extracted 2026-09-08 from
> `../archive/ui_overhaul_design_system_spotify.md` (phases 0-6, shipped) and reconciled
> against the code as it stands at commit `37ccf20`.
>
> **Authority:** `../../CLAUDE.md` wins on architecture and layering.
> `frontend_engineering_rules.md` wins on file structure.
> This document is the single source of truth for **tokens and shared components**.
>
> **In flight:** the consolidation work described in section 8 is being executed by
> `../plans/2026-09-stability-performance/07-design-system-consolidation.md`. Where this
> document describes a target that the code has not reached yet, it is marked
> **(target)**.

## 1. Personality

Playful but purposeful. Whimsy lives in motion and colour accents; the information
hierarchy is always unambiguous. Neutral near-black stack, a single reserved brand accent,
and content (album artwork) supplying the vivid colour. Semantic colour is reserved for
state, never for decoration.

Dark theme is the default and primary design target. Every other theme must be addable by
supplying one semantic token set — never by editing component code.

## 2. Token taxonomy

A strict three-layer hierarchy. This is what makes a new theme a token swap.

    Primitive tokens      raw values, theme-agnostic
       e.g. spacePrimitives[4] = "16px", radiusPrimitives.pill = "999px"
            |
            v
    Semantic tokens       role-based, theme-specific -- the ONLY layer a theme redefines
       e.g. --color-bg-app, --color-surface, --color-text-primary, --shadow-overlay
            |
            v
    Component tokens      per-component intent, theme-agnostic, resolve to semantic
       e.g. --button-primary-bg, --card-radius, --sheet-shadow, --input-min-height

### Rules

1. Components reference **semantic** or **component** tokens. Never primitives. Never raw
   values.
2. Themes override **semantic** tokens only.
3. A raw `px`, hex colour or duration literal in a CSS module is a defect. The two
   exceptions are documented in sections 4 and 6.
4. Structural tokens (space, type, radius, motion, z-index) are theme-agnostic and emitted
   once into `:root`.
5. Semantic colour and shadow tokens are injected per theme at runtime by `applyTheme`.

### Where the tokens live

| Concern | File |
| --- | --- |
| Raw scales | `apps/web/src/features/theme/tokens/primitives.ts` |
| Component tokens | `apps/web/src/features/theme/tokens/components.ts` |
| Dark theme (canonical) | `apps/web/src/features/theme/darkThemeTokens.ts` |
| Light theme | `apps/web/src/features/theme/lightThemeTokens.ts` |
| Public contract | `apps/web/src/features/theme/tokenContract.ts` |
| Runtime application | `apps/web/src/features/theme/themeRegistry.ts` |
| Structural emission | `apps/web/src/app/styles/globals.css` |

`SemanticColorTokens` in `darkThemeTokens.ts` is a TypeScript type derived from the dark
theme, so **a theme that forgets a token fails typecheck**. Dark is canonical; every other
theme must define exactly the same key set. Do not weaken this.

`primitives.ts` and `globals.css` must stay in sync for space, type, radius, motion and
z-index. That duplication is deliberate (TS for compile-time completeness, CSS for the
`:root` emission) and is guarded by `themeTokens.test.ts`.

## 3. Scales

Use these; do not invent values.

| Scale | Values |
| --- | --- |
| Space | `--space-0..12` (0, 4, 8, 12, 16, 20, 24, 32, 40, 48 px) plus aliases `--space-screen-gutter`, `--space-card-padding`, `--space-stack-gap` |
| Radius | `--radius-{xs,sm,md,lg,xl,pill,circle}` (8, 12, 16, 24, 28 px, 999px, 50%) |
| Type | `--type-{display,title-lg,title-md,body-lg,body,label,caption,micro}-{size,leading,weight,tracking}` |
| Motion duration | `--motion-{quick,standard,screen,expressive}-duration` (160, 240, 320, 460 ms) |
| Motion easing | `--motion-ease-{standard,emphasized,decelerate,accelerate}` |
| Touch target | `--size-touch-target` (48px) |

Legacy radii (`--radius-{card,panel,input,button}`) exist for the components still being
migrated. Do not use them in new code.

## 4. Colour

Semantic roles only. The full set is the key set of `SemanticColorTokens`; the roles that
matter most in review:

| Role | Intent |
| --- | --- |
| `--color-bg-app` | App base, deepest surface |
| `--color-surface`, `--color-surface-elevated`, `--color-surface-interactive` | Cards, panels, pressable surfaces |
| `--color-text-{primary,secondary,muted}` | Text hierarchy |
| `--color-accent-brand`, `--color-accent-primary` | The single reserved accent |
| `--color-border-subtle` | Hairlines |
| `--color-status-danger-{surface,text,border}` and siblings | State only |
| `--shadow-{none,raised,overlay,dialog}` | Elevation |

### The two permitted literal-colour cases

1. **Third-party brand colours.** Spotify green must not shift with the theme. It gets its
   own semantic tokens (`--color-brand-spotify`, `--color-brand-spotify-on`) defined
   identically in every theme, so it is still a token and still auditable. **(target)**
2. **Mixing endpoints.** `color-mix(in srgb, X 80%, white 20%)` uses white and black as
   maths, not as colour. These get `--color-mix-light` / `--color-mix-dark` so a future
   high-contrast or sepia theme can redirect them. **(target)**

Everything else is a defect. A guard test enforces this
(`apps/web/src/test/guards/noHardcodedColors.test.ts`, **target**).

## 5. Motion

Material 3 principles: emphasise, enter, exit.

- Entering elements use **emphasised decelerate**.
- Exiting elements use **emphasised accelerate**.
- State changes use **standard** easing.
- 200-350 ms for most transitions; up to 500 ms only for large-screen entries and
  celebration moments. No transition may exceed 500 ms.
- Motion must communicate a state change, not decorate it. Every animation answers
  "what just happened?" Scrolling is not a state change and must not be animated.
- Animate `transform` and `opacity` only. Never `width`, `height`, `margin`, `top`,
  `left`. Avoid animating `filter`, `backdrop-filter` and `box-shadow` — cross-fade
  pre-baked layers instead.
- Framer Motion for meaningful state transitions. CSS for static layout and simple
  hover/focus/disabled states. `@dnd-kit` owns drag mechanics; Framer Motion may decorate
  drag outcomes only.
- `prefers-reduced-motion` is handled by `useReducedMotionPreference` (components) and
  `prefersReducedMotion` (services). Never a one-off `matchMedia` check.

Motion helpers live in `apps/web/src/features/motion/`. Add a new transition there, not in
a component.

## 6. Layering

One scale, one meaning per layer. **(target — the extended scale and the migration are
Doc 06 section 2 of the live plan.)**

| Token | Value | Layer |
| --- | --- | --- |
| `--z-base` | 0 | Page content |
| `--z-raised` | 10 | Cards, chips, elevated in-page surfaces |
| `--z-sticky` | 100 | Sticky headers, scroll fades |
| `--z-nav` | 200 | Bottom docks, action bars |
| `--z-overlay` | 300 | Scrims below sheets |
| `--z-sheet` | 400 | Bottom and side sheets |
| `--z-sheet-nested` | 450 | A sheet opened from a sheet |
| `--z-dialog` | 500 | Modal dialogs |
| `--z-dialog-nested` | 550 | Confirmation opened from a dialog |
| `--z-hint` | 600 | Onboarding coach marks |
| `--z-toast` | 700 | Toasts and connection banners |
| `--z-celebration` | 800 | Win and celebration effects |
| `--z-blocking` | 900 | Loading and recovery overlays; nothing may cover these |

### The one permitted literal
Integers `-1` to `9` for stacking **within** a single component, so local stacking can
never escape its layer. Any other literal is a defect, enforced by
`apps/web/src/test/guards/zIndexScale.test.ts` (**target**).

Overlay components never set their own `z-index`. The overlay host assigns it from the
stack depth and the entry kind.

## 7. Layout

- **Structure comes from assemblies, not breakpoints.** Mobile versus desktop is resolved
  once at the page root by `usePageLayoutMode`; each page has separate `mobile/` and
  `desktop/` assemblies with a shared controller hook.
- Media queries are for **within-assembly refinement** only (small versus large phone type
  scale, portrait versus landscape composition). Never to swap page structure.
- Portrait and landscape are distinct compositions inside the mobile assembly.
- Every screen edge uses `--safe-area-*`; bottom docks add `env(safe-area-inset-bottom)`.
- Support 320 px width upward. Degrade through the spacing and type tokens, not bespoke
  rules.

## 8. Component system

The shared library is `apps/web/src/features/ui/primitives/`. Everything else in
`features/ui/` is either a composed pattern or a component still awaiting promotion.

### Current primitives

`Avatar`, `Button`, `Card`, `Chip` / `ChipButton`, `Dialog`, `EmptyState`, `IconButton`,
`ListRow` / `ListRowButton`, `SegmentedControl`, `Skeleton`.

### Target primitives — being promoted **(target)**

`TextField`, `NumberStepper`, `Select` (adaptive: native on desktop, sheet on mobile),
`Toggle`, `SettingRow`, `Banner`, `ProgressBar`, `Sheet`, `BlockingOverlay`.

### Rules

1. **One component per job.** There is exactly one button, one icon button, one dialog
   shell, one sheet shell. Multiple implementations of the same control are a defect —
   this is what produced the four parallel button systems the live plan is removing.
2. **Page CSS may lay out a primitive; it may not restyle one.** If a page needs a
   different look, the primitive needs a variant, not an override.
3. **A new primitive is justified at the third use.** Extract after the second or third
   meaningful repetition, not the first coincidence.
4. Primitives are presentational, token-driven and prop-narrow. No data fetching, no
   socket access, no room state.
5. Each primitive exposes component tokens so a theme can adjust its feel without touching
   its CSS.
6. Every primitive appears on the dev-only gallery at `/dev/ui`, in every variant and
   state, in both themes. "Is it on `/dev/ui`?" is a review question.
7. No primitive stylesheet exceeds 200 lines.

### Interaction conventions

- Press feedback: `transform: scale(0.97)` plus a fill shift on `:active`, via CSS.
- Haptics on primary actions through `services/haptics/triggerPressHaptic`, which already
  respects reduced motion. Never call `navigator.vibrate` directly.
- Optimistic UI only where safe and reversible. The server remains the source of truth;
  never fake game state.

## 9. Accessibility

- Touch targets at least 48 x 48 px, with at least 8 px (prefer 12-16 px) gaps.
- WCAG AA contrast in both themes. Verify accent-on-surface and text-on-accent pairings
  whenever a semantic colour changes.
- Visible `:focus-visible` styles; every control keyboard reachable on desktop.
- Icon-only controls carry a meaningful `aria-label`. `IconButton` requires it by type.
- Live region for turn and phase changes.
- Overlays trap focus while open and restore it to the trigger on close — provided by the
  overlay host, not by each caller.
- Type in tokens; layouts tolerate larger system text without clipping.
- Honour safe-area insets; no content under notches or home indicators.

## 10. Performance guardrails

- Animate `transform` and `opacity` only (section 5).
- No always-on decorative animation during gameplay unless measured cheap on a real device.
- Per-layout lazy loading: the mobile assembly never loads the desktop one, and vice versa.
- Preserve the manual vendor chunking in `apps/web/vite.config.ts`.
- **Never spread-merge CSS modules into a barrel.** It defeats per-component CSS splitting
  and silently resolves duplicate class names by import order. Guarded by
  `apps/web/src/test/guards/noCssBarrels.test.ts` (**target**).
- Token migration must not add runtime cost; custom properties are cheap and injection
  happens once per theme change.
- Skeletons for perceived performance, matching the real page structure — a generic
  placeholder is worse than none, because it causes a second layout shift.

## 11. Definition of done for a screen

- No raw colour, spacing, radius, duration or z-index literal.
- Every control is a primitive or a documented composition of primitives.
- Renders correctly in dark and light, portrait and landscape, at 320 px and at tablet
  width.
- Touch targets meet section 9.
- All motion respects `prefers-reduced-motion`.
- A structure-matching skeleton exists for its loading state.
- Present on `/dev/ui` if it introduced or changed a primitive.
