# TuneTrack Beats — UI Overhaul Design System (Spotify-Inspired, Mobile-First)

> **Purpose**: Define a robust, token-driven, Spotify-inspired flat design system and a phased plan to overhaul the TuneTrack UI without regressing performance, features, or code quality.
>
> **Status**: Phases 0–6 complete. Phase 7 (desktop visual pass) is deferred.

---

## 0. How This Document Relates To Existing Docs

This document **refines the visual direction** and **formalizes the design-system layer**. It does not replace architecture or engineering rules.

| Document | Relationship |
| --- | --- |
| `frontend_engineering_rules.md` | **Wins on architecture.** All work here obeys layering, file-size, motion, and CSS rules. |
| `mobile_desktop_assembly_separation_plan.md` | **Already implemented and reused.** We keep mobile/desktop as separate assemblies; this is exactly how we avoid media-query bloat. |
| `tunetrack_beats_mobile_ui_plan_brief.md` | **Superseded on aesthetics only.** That brief proposed neon purple/cyan/pink. We pivot to a Spotify-like disciplined, flat, content-forward look. The structural/UX rules in that brief (touch-first, thumb zone, grid timeline, fullscreen menu) remain valid. |
| `tunetrack_full_architecture.md` | Wins on architecture and server authority. |

**What already exists and we build on** (from the current codebase audit):

- CSS Modules per component, plus one `globals.css`.
- Token-based theming via `features/theme/*` (dark + light) applied to `:root` as CSS custom properties at runtime.
- Explicit **mobile/desktop assemblies** on `HomePage`, `LobbyPage`, `GamePage` with layout-level lazy loading.
- Centralized motion system in `features/motion/*` with a shared reduced-motion helper.
- Zustand `uiPreferences` store for persisted UI prefs (theme, view flags, hidden-card mode).

**Key gaps this overhaul closes**:

1. No **spacing scale** tokens — sizes are scattered as raw `px`/`clamp()` across ~39 CSS modules.
2. No **typography scale** tokens — font sizes are hardcoded per component.
3. Tokens live only in TS; there is no documented **token taxonomy** (primitive → semantic → component).
4. Radii live in `globals.css`, colors in TS — no single, coherent token contract.
5. No shared **primitive component library** matching a Spotify-like language (pill buttons, cards, chips, bottom sheets are partially present but not systematized).

---

## 1. Goals, Non-Goals, Constraints

### 1.1 Goals

- **Flat, content-forward, Spotify-like** aesthetic: near-black dark theme, restrained accent usage, card-based surfaces, pill/circle geometry, subtle depth.
- **Mobile-first**, portrait-primary, with intentional **landscape** support (not stretched portrait).
- A **robust design system**: one token contract, one theming mechanism, extensible to future themes; **dark + light shipped first**.
- **Minimal CSS media queries** — structural differences handled by mobile/desktop assemblies, not breakpoints.
- **Great UX**: thumb-zone actions, bottom sheets, progressive disclosure, unambiguous feedback, 44–48px touch targets.
- **Phased delivery** with a validation checkpoint after each phase.

### 1.2 Non-Goals (for this overhaul)

- **No desktop redesign yet.** Desktop assemblies keep working; a desktop visual pass is a *later, separate* effort. We only ensure desktop consumes the new tokens so it doesn't break.
- No routing/IA rewrite of the game flow (Home → Play → Lobby → Game stays).
- No new game features, no backend/contract changes.
- No animation library swap (Framer Motion stays).

### 1.3 Hard Constraints

- Do not regress **mobile performance** (animate only `transform`/`opacity`; avoid heavy blur/shadow animation).
- Do not break **features, tests, or server authority**.
- Obey **file-size soft limits** (component ~200–250, controller hook ~250–300, CSS module ~250–300, utility ~150).
- Respect `prefers-reduced-motion` via the shared helper only.
- Keep `packages/*` untouched (this is a frontend-presentation overhaul).

---

## 2. Design Principles (Spotify-Inspired + Mobile UX)

Grounded in Spotify's Encore system and 2026 mobile UX research.

1. **The UI disappears so the content glows.** Chrome is quiet (near-black/neutral surfaces); saturated color is *reserved*. In Spotify, real color comes from album art + one brand green used only for primary actions/active state. We mirror this: **one primary brand accent**, semantic colors for game outcomes, and **album artwork as the color source** on song cards.
2. **Card-based architecture scales infinitely.** One `Card` primitive (varying image shape, metadata, interaction) underpins songs, players, actions, and rooms — like Spotify's single card primitive across all surfaces.
3. **Flat, but with honest depth signals.** Not "pure flat": use subtle elevation/shadow/scale to signal interactivity and layering. Reserve heavy shadow only for dialogs/sheets.
4. **Thumb-zone first.** Primary actions live in the bottom ~40% of the screen. Destructive/rare actions go to harder-to-reach zones (top). (Steven Hoober: ~75% of interactions are thumb-driven.)
5. **Bottom sheets over top modals** for secondary/contextual content — reachable, familiar, and expandable.
6. **Progressive disclosure.** Show only what's needed per level; most content reachable in 2–3 taps. Keep gameplay screen minimal by default.
7. **Pill-and-circle geometry.** Buttons are pills; icon/play controls are circles. No cramped square interactive surfaces.
8. **Tokens enforce consistency at scale.** Spacing, color, typography, motion all come from tokens, never hardcoded — the same discipline that lets Encore stay coherent across platforms.
9. **Feedback is unambiguous.** Every action answers: *what happened, did it succeed, what changed, what's next.* Reinforce with motion + optional haptics.
10. **Respect platform conventions.** iOS edge-swipe back + bottom tab affordances; Android system back; 44pt (iOS) / 48dp (Android) minimum targets; safe-area insets everywhere.

---

## 3. Design System Architecture

### 3.1 Token Taxonomy (three layers)

We adopt a strict **primitive → semantic → component** token hierarchy. This is the backbone that makes future themes a "swap a token set" operation.

```
Primitive tokens      (raw values, theme-agnostic)
   e.g. --tt-green-500: #1ed760;  --tt-space-4: 16px;  --tt-font-size-3: 16px
        │
        ▼
Semantic tokens       (role-based, theme-specific — the ONLY thing themes redefine)
   e.g. --color-accent-primary, --color-bg-app, --color-surface, --space-inline-md
        │
        ▼
Component tokens       (optional, per-component intent, resolve to semantic)
   e.g. --button-primary-bg, --card-radius, --sheet-shadow
```

**Rules**:

- Components reference **semantic** (and occasionally **component**) tokens — never primitives, never raw values.
- Themes override **semantic** tokens only. Primitives are shared; component tokens resolve through semantics.
- Every raw `px`/color/duration in a CSS module is a bug once the system lands — replace with a token.

### 3.2 Single Source Of Truth

Today: radii in `globals.css`, colors/shadows in `features/theme/*.ts`. We consolidate into **one token module per concern** and generate CSS variables from it.

Proposed structure (extends current `features/theme`):

```
features/theme/
  tokens/
    primitives.ts        # raw scales: color ramps, spacing, type, radii, durations, easings, z-index
    semantic.dark.ts     # dark theme: semantic → primitive mapping
    semantic.light.ts    # light theme: semantic → primitive mapping
    components.ts         # component tokens → semantic (theme-agnostic)
    tokenContract.ts      # TS types: SemanticTokenName union (compile-time safety)
  applyTheme.ts          # existing runtime injector, extended to emit all semantic tokens
  themeRegistry.ts       # existing registry, now keyed on semantic maps
  themeTypes.ts
```

- **Structural, theme-agnostic** tokens (spacing, type scale, radii, durations, easings, z-index) are emitted **once** into `:root` from `globals.css` (or injected once at boot). They never change per theme.
- **Semantic color/shadow/gradient** tokens are injected per theme by the existing `applyTheme()` — this already works; we just widen the token set.
- `tokenContract.ts` exports a **union type** of every semantic token name so a theme that forgets a token fails typecheck. This guarantees new themes are complete.

> Keeping tokens in TS (not raw CSS files) is deliberate: it gives compile-time completeness checks and lets game code read gradients/scales it already needs (e.g. `gameCardGradients`).

### 3.3 Color System

**Philosophy (from Spotify):** neutral, near-black stack; a **single reserved brand accent**; content (album art) provides the vivid color; semantic colors only for state.

#### Dark theme (flagship)

| Semantic role | Intent | Reference value |
| --- | --- | --- |
| `color-bg-app` | App base (deepest) | `#0E0E10` (near-black neutral) |
| `color-surface` | Cards / panels | `#181818` |
| `color-surface-elevated` | Raised cards / sheets | `#1F1F1F` |
| `color-surface-interactive` | Hover/press fills | `#2A2A2A` |
| `color-text-primary` | Primary text | `#FFFFFF` |
| `color-text-secondary` | Metadata | `rgba(255,255,255,0.72)` |
| `color-text-muted` | Disabled/hint | `rgba(255,255,255,0.48)` |
| `color-accent-primary` | **Reserved** primary CTA / active nav / play | `#1ED760`-class brand green *(final hue TBD, see §3.3.3)* |
| `color-accent-on` | Text/icon on accent | `#0A0A0A` |
| `color-border-subtle` | Hairlines / inset borders | `rgba(255,255,255,0.10)` |
| `color-success` | Correct placement | `#22C55E` |
| `color-danger` | Wrong placement / destructive | `#EF4444` |
| `color-warning` | Caution / challenge | `#F59E0B` |
| `color-info` | Neutral notices | `#3B82F6` |

#### Light theme (shipped alongside dark)

Light is a **first-class citizen, not an inverted afterthought**. Use warm, soft neutrals rather than harsh white; keep the *same* accent discipline.

| Semantic role | Reference value |
| --- | --- |
| `color-bg-app` | `#F7F7F5` (soft off-white) |
| `color-surface` | `#FFFFFF` |
| `color-surface-elevated` | `#FFFFFF` + subtle shadow |
| `color-surface-interactive` | `#F0F0EE` |
| `color-text-primary` | `#111114` |
| `color-text-secondary` | `rgba(0,0,0,0.66)` |
| `color-accent-primary` | Slightly deepened brand green for contrast on light |
| `color-border-subtle` | `rgba(0,0,0,0.10)` |

**Contrast rule**: All text/background pairings must meet **WCAG AA** (4.5:1 body, 3:1 large). Accent-on-surface for text must pass AA; where green fails on light surfaces, use accent for fills/icons and dark text for labels.

#### 3.3.3 Brand accent decision

Spotify green is iconic *to Spotify*. To avoid looking like a Spotify clone while keeping the same disciplined single-accent model, the brand accent hue is a **decision point** (see §14 Open Questions). Default proposal: keep a **vivid green** family for the "flat, energetic music" feel, or pick a distinct TuneTrack hue. Either way the *rule* is unchanged: **one reserved accent**, everything else neutral + content color.

#### Content-derived color (song cards)

Song cards get their color from **album artwork**, exactly like Spotify. Keep the existing `hiddenCardMode` ("artwork" | "gradient"). For unrevealed cards, use a themed neutral gradient token (`gradient-card-hidden`), not the accent.

### 3.4 Typography Scale

Spotify uses a compact 10–24px range with ~14 styles. We define a small, semantic type scale (mobile-tuned), using the existing Inter stack.

| Token | Size / Line | Weight | Use |
| --- | --- | --- | --- |
| `type-display` | 32 / 36 | 800 | Home hero title |
| `type-title-lg` | 24 / 28 | 700 | Screen titles |
| `type-title-md` | 20 / 26 | 700 | Section headers, modal titles |
| `type-body-lg` | 16 / 24 | 500 | Primary body, list items |
| `type-body` | 14 / 20 | 500 | Default body |
| `type-label` | 13 / 16 | 600 | Buttons, chips, tabs |
| `type-caption` | 12 / 16 | 500 | Metadata, hints |
| `type-micro` | 11 / 14 | 600 | Badges, counters |

- Each token is a bundle: `font-size`, `line-height`, `font-weight`, `letter-spacing`. Expose as CSS vars (`--type-body-size`, `--type-body-leading`, ...) or a small set of utility classes in `globals.css` (`.typeBody`, `.typeTitleMd`) that components compose.
- **No per-component `font-size`** once migrated. Remove scattered `clamp()` in favor of assembly-level scale choices (mobile assembly picks mobile sizes; desktop can pick larger later).
- Keep the system-font fallback stack already present; keep `font-optical-sizing` and rendering hints in `globals.css`.

### 3.5 Spacing Scale (8pt grid)

A single 4/8-based scale. All padding, margin, and gap reference it.

| Token | Value | Typical use |
| --- | --- | --- |
| `space-0` | 0 | reset |
| `space-1` | 4px | icon gaps, hairline insets |
| `space-2` | 8px | **minimum gap between touch targets** |
| `space-3` | 12px | compact padding |
| `space-4` | 16px | default component padding |
| `space-5` | 20px | card padding |
| `space-6` | 24px | section gaps |
| `space-8` | 32px | screen gutters (comfortable) |
| `space-10` | 40px | large separations |
| `space-12` | 48px | hero spacing |

Semantic aliases where helpful: `--space-screen-gutter`, `--space-card-padding`, `--space-stack-gap`.

**Touch rules**: interactive elements ≥ **48×48px** target (invisible padding allowed on smaller icons); minimum **8px** gap, prefer **12–16px** between adjacent targets.

### 3.6 Radii

Pill-and-circle geometry. Keep/extend the existing radius tokens.

| Token | Value | Use |
| --- | --- | --- |
| `radius-xs` | 8px | chips, small controls, inputs (compact) |
| `radius-sm` | 12px | inputs, small cards |
| `radius-md` | 16px | cards |
| `radius-lg` | 24px | large cards, sheets top corners |
| `radius-xl` | 28px | hero panels |
| `radius-pill` | 999px | buttons, chips |
| `radius-circle` | 50% | play/icon buttons, avatars, artist-style images |

Card imagery: **square** (album/song), **circle** (player avatar) — matching Spotify's shape semantics.

### 3.7 Elevation & Shadow

Flat-first: most surfaces sit flat on the background differentiated by fill, not shadow. Reserve shadow for floating/overlay layers.

| Token | Use | Reference |
| --- | --- | --- |
| `shadow-none` | Flat cards on app bg | `none` |
| `shadow-raised` | Interactive/raised card | `0 2px 8px rgba(0,0,0,0.24)` (dark) / softer on light |
| `shadow-overlay` | Bottom sheets, popovers | `0 8px 32px rgba(0,0,0,0.32)` |
| `shadow-dialog` | Modal dialogs | `0 24px 64px rgba(0,0,0,0.5)` (Spotify-like heavy dialog shadow) |

- **Do not animate shadows** on mobile (perf). Cross-fade a pre-baked shadow layer if depth change is needed.
- Light theme uses softer, higher-blur, lower-opacity shadows (airy feel).

### 3.8 Motion Tokens

Keep the existing `features/motion` architecture; align its scale to Material 3 principles already in `CLAUDE.md`.

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `motion-quick` | 140–160ms | standard | hover/press, small toggles |
| `motion-standard` | 200–260ms | standard | most state transitions |
| `motion-screen` | 300–320ms | emphasized decelerate (enter) / accelerate (exit) | route/sheet transitions |
| `motion-expressive` | 400–500ms | emphasized | reveal, celebration moments |

- **Enter** = emphasized decelerate; **exit** = emphasized accelerate; **in-place state** = standard. (Material 3, per `CLAUDE.md`.)
- Spring physics allowed for tactile drag (timeline), damped (not bouncy).
- All motion factories keep accepting `reduceMotion` and return no-op/instant variants — already the pattern.

### 3.9 Z-Index Layers

Documented layer scale (per engineering rule "don't use z-index casually"):

| Token | Value | Layer |
| --- | --- | --- |
| `z-base` | 0 | content |
| `z-sticky` | 100 | sticky headers, bottom action bars |
| `z-nav` | 200 | persistent nav / docks |
| `z-overlay` | 300 | scrims |
| `z-sheet` | 400 | bottom sheets |
| `z-dialog` | 500 | modal dialogs |
| `z-toast` | 600 | toasts |
| `z-celebration` | 700 | full-screen gameplay celebration |

### 3.10 Layout & Breakpoints

- **Structure comes from assemblies, not breakpoints.** Mobile vs desktop is resolved once at the page root (`usePageLayoutMode`), already implemented.
- Media queries are allowed **only** for *within-assembly refinement* (e.g. small vs large phone type scale, portrait vs landscape composition) — never to swap whole page structures.
- **Orientation**: portrait and landscape are treated as distinct compositions inside the mobile assembly (see §6.5 gameplay). Prefer a small `useOrientation`/existing viewport hook + assembly-level branching over deep CSS.
- **Safe areas**: every screen edge uses the existing `--safe-area-*` insets; bottom action bars add `env(safe-area-inset-bottom)`.
- **Device range**: support small (iPhone SE ~375px) → large phones and modern Android. Layout must not break at 320px width; hero/timeline degrade gracefully via the spacing/type tokens, not bespoke rules.

---

## 4. Theming Architecture (Extensible)

**Goal**: add a new theme by adding one `semantic.<name>.ts` file — zero component edits.

Mechanism (extends what exists):

1. `primitives.ts` holds raw ramps/scales (shared).
2. Each theme file maps **every** semantic token (enforced by `tokenContract.ts` union type) to primitives/values.
3. `themeRegistry` registers themes by id; `applyTheme(themeId)` sets `data-theme` and injects semantic vars onto `:root` (already implemented).
4. Structural tokens (spacing/type/radii/motion/z) are injected once, theme-independent.
5. `main.tsx` continues to pre-apply the stored theme before paint (prevents flash); `App.tsx` reacts to Zustand `theme`.
6. PWA `theme-color` / manifest colors read from the active theme's `color-bg-app` (already wired for dark).

**Adding "midnight", "sunset", etc. later**: create `semantic.midnight.ts`, register it, add to the theme picker. Nothing else changes. This satisfies "support additional themes from day one."

**Theme picker UX**: the existing App Shell → Settings segmented control extends from dark/light to a small theme list; persists via `uiPreferences.setTheme`.

---

## 5. Component System (Spotify-Like Primitives)

A shared primitive library in `features/ui/` (extending what's there). Each is presentational, token-driven, prop-narrow, and reused by both assemblies.

### 5.1 Core primitives

| Primitive | Spotify parallel | Notes |
| --- | --- | --- |
| `Button` | Pill button (primary/outline/ghost/danger) | Pill radius; primary = reserved accent; min height 48–56px; press-scale feedback. Consolidate current `ActionButton`, `RoomPrimaryActionButton`, `RoomDangerActionButton` into one variant-driven `Button`. |
| `IconButton` | Circular control | 48×48 target, `radius-circle`. |
| `Card` | The universal card primitive | Square/circle image slot + title + metadata + optional trailing action. Basis for song, player, room, action cards. |
| `Chip` | Filter/segment chip | Pill; used for filters, tags, view toggles, phase chips. |
| `SegmentedControl` | Library filter chip row / tabs | Horizontal, scrollable; used for menu tabs, dark/light, theme. |
| `ListRow` | Track row | Leading image/avatar, primary+secondary text, trailing control; 56–64px height. |
| `BottomSheet` | Spotify's up-slide sheets | Already present; standardize handle, snap points, scrim, safe-area. Primary pattern for contextual/secondary content. |
| `Dialog` | Center modal | Only for blocking confirmations; heavy `shadow-dialog`. Prefer sheets on mobile. |
| `Toast` | Snackbar | Bottom-anchored, above nav/dock; existing stack restyled. |
| `Input` / `Select` / `Toggle` / `Range` | Encore form controls | Keep current `FormControls`, restyle to tokens; 48px min height. |
| `Avatar` | Circular user image | `radius-circle`; initials fallback. |
| `Badge` / `Counter` | Count pills | For card counts, TT tokens. |
| `ProgressDots` / `Stepper` | Onboarding progress | For lobby/setup flow. |
| `Skeleton` | Loading placeholder | Perceived-performance: skeletons for lists/cards while data loads. |
| `EmptyState` | Empty content | Icon + copy + optional CTA. |

### 5.2 Component tokens

Each primitive exposes component tokens resolving to semantics, e.g.:

```
--button-primary-bg: var(--color-accent-primary);
--button-primary-fg: var(--color-accent-on);
--button-radius: var(--radius-pill);
--card-bg: var(--color-surface);
--card-radius: var(--radius-md);
--sheet-radius-top: var(--radius-lg);
--sheet-shadow: var(--shadow-overlay);
```

This lets a theme tweak a single component's feel without touching component CSS.

### 5.3 Interaction & feedback conventions

- **Press feedback**: subtle scale (`0.97`) + fill shift on active; via CSS for cheap feedback, Framer only for meaningful transitions (per rules).
- **Haptics** (where supported): light tap on primary actions, success/error patterns on reveal — through a `services/vibration` wrapper, respecting a preference toggle.
- **Optimistic UI** only where safe/reversible (server remains truth).

---

## 6. Navigation, IA & Screen Direction

TuneTrack is a **flow-based party game**, not a content browser, so we adopt Spotify's *patterns* (bottom-anchored actions, sheets, cards, chips, progressive disclosure) rather than a global persistent tab bar. Where "tabs" fit (in-game menu), we use a `SegmentedControl`.

### 6.1 Global shell

- **Bottom-anchored primary action zone** on flow screens (Home CTA, Lobby "Start", Game action dock) — thumb zone.
- **Top area**: title + rare/secondary actions only (settings gear, back). Back respects platform (iOS edge-swipe friendly; visible back where needed).
- **App Shell menu** becomes a **bottom sheet** on mobile (already dialog/sheet-aware), full-screen takeover option for the in-game menu per the mobile brief.

### 6.2 Home / Landing

- Fullscreen, content-forward: app identity + a single dominant CTA (Start/Continue) anchored bottom.
- Quiet animated background (cheap, `transform`/`opacity` only), subtle CTA emphasis.
- Secondary "Join with code" as a subtle secondary action / sheet.

### 6.3 Play (create/join)

- Give it the **card + bottom-sheet** treatment; consider giving `PlayPage`/`JoinRoomPage` mobile/desktop assemblies too (currently single-layout) — *optional, later phase*.
- Create-room and join-by-code as focused steps; available-rooms as a card list with skeletons + empty state.

### 6.4 Lobby / Setup (guided onboarding feel)

- Stacked, low-cognitive-load sections (identity, host settings, playlist/Spotify, roster, actions).
- Progressive disclosure: advanced host settings behind a sheet/expander.
- Bottom-anchored "Start" (host) / clear waiting state (non-host).
- Playlist & Spotify flows use **bottom sheets** (already partly the case): search, review, track details.
- Optional `ProgressDots`/`Stepper` if we lean into step-by-step onboarding.

### 6.5 Game (minimal, timeline-first)

Follow the mobile brief's gameplay rules:

- **Portrait**: compact top status strip → active/preview card → **grid-based timeline** (small readable cards, multiple visible; *not* a thin horizontal strip) → bottom action dock (thumb zone). Secondary info (standings, history) behind chips/sheets.
- **Landscape**: intentionally different composition — wider timeline visibility (horizontal/hybrid), active card + placement target obvious; not a stretched portrait.
- **Action docks** (turn/reveal/challenge/finished) live bottom-anchored; phase-driven.
- **In-game menu**: full-screen/sheet takeover with `SegmentedControl` tabs (players/playback/history/view/settings) — already structured this way.
- **Feedback**: correct → success color + celebration motion; wrong → danger + shake/settle; reveal → emphasized year animation. Every outcome unambiguous.

### 6.6 Reveal & celebration

- Emphasized, quick, impactful motion; success/fail state + score change; `z-celebration` layer; cheap on mobile (no heavy blur), respects reduced motion.

---

## 7. Accessibility & Responsiveness

- **Touch**: ≥48×48 targets, ≥8px (prefer 12–16) gaps.
- **Contrast**: WCAG AA across both themes; verify accent/text pairings.
- **Focus**: keep visible `:focus-visible` styles (already in globals); keyboard reachable on desktop.
- **Reduced motion**: shared helper only; provide static/opacity fallbacks for all key transitions.
- **Text scaling**: type via tokens/`rem`; layouts tolerate larger system text without clipping.
- **Orientation & safe areas**: honor insets; no content under notches/home indicators.
- **Screen readers**: meaningful labels on icon-only controls; live region for turn/phase changes.

---

## 8. Performance Guardrails

- Animate only `transform`/`opacity`; **no** `width`/`height`/`margin`/`top`/`left` animation on mobile.
- No always-on decorative animation during gameplay unless proven cheap on real devices.
- Avoid animating `filter`/`backdrop-filter`/`box-shadow`; if depth must change, cross-fade pre-baked layers.
- Keep per-layout **lazy loading** (mobile assembly never loads desktop, and vice versa).
- Preserve existing manual vendor chunking (framer-motion, dnd-kit, etc.).
- Token migration must not increase runtime cost — CSS custom properties are cheap; injection happens once per theme change.
- **Skeletons/optimistic UI** for perceived performance, but never fake server-authoritative game state.

---

## 9. Migration Strategy (No Regressions)

**Principle: additive, then adopt, then remove.**

1. **Add the token layer alongside existing styles** — introduce new semantic tokens without deleting old ones. Existing components keep working.
2. **Adopt tokens component-by-component** — replace raw values with tokens as each component is restyled; verify visually + run `verify`/`build`.
3. **Remove dead tokens/values** once nothing references them.
4. **One primitive at a time** — build `Button`, migrate call sites, delete old button variants only after all references move.
5. **Screen-by-screen** — restyle within existing assemblies; do not restructure architecture. Keep mobile/desktop split intact.
6. **Keep desktop functional** — desktop consumes the same tokens (inherits improvements for free) but is not visually redesigned yet; guard against layout breakage.
7. **Feature-flag risky screens** if needed (e.g. behind a dev preference) to validate before switching default.
8. **Tests stay green** at every step (`npm run verify -w apps/web`, `npm run build -w apps/web`).

---

## 10. Phased Implementation Plan (Validate After Each Phase)

Each phase ends at a **validation gate**: build + verify green, visual review on a real phone (portrait + landscape), no perf/feature regression, file-size limits respected.

### Phase 0 — Foundations: Token System & Docs (no visible change)

**Scope**

- Create `features/theme/tokens/` (`primitives.ts`, `semantic.dark.ts`, `semantic.light.ts`, `components.ts`, `tokenContract.ts`).
- Define spacing, type, radii, elevation, motion, z-index tokens; extend color semantics for both themes.
- Emit structural tokens once; extend `applyTheme` to inject full semantic set.
- Add typographic utility classes (`.typeBody`, etc.) to `globals.css`.
- Add compile-time completeness check (union type).

**Validation gate**

- App looks identical; dark/light still switch; `verify`/`build` green; no visual diff regressions.

### Phase 1 — Primitive Component Library

**Scope**

- Build/standardize `Button`, `IconButton`, `Card`, `Chip`, `SegmentedControl`, `ListRow`, `BottomSheet`, `Dialog`, `Toast`, `Avatar`, `Badge`, `Skeleton`, `EmptyState`, restyled to tokens.
- Consolidate duplicated buttons into one variant-driven `Button`.
- Establish press/haptic conventions.

**Validation gate**

- Primitive gallery reviewed (a dev-only preview route or Storybook-lite page is optional); existing screens still render via old or new components; no regressions.

### Phase 2 — Home + Play/Join Restyle

**Scope**

- Apply new visual language to `HomePage` (mobile first): content-forward hero, bottom-anchored CTA, quiet animated bg.
- Restyle `PlayPage`/`JoinRoomPage` with cards, sheets, skeletons, empty states.
- (Optional) give Play/Join mobile/desktop assemblies.

**Validation gate**

- Home + entry flow validated on phones (portrait + landscape), both themes; navigation intact; perf unchanged.

### Phase 3 — Lobby Restyle (Guided Onboarding Feel)

**Scope**

- Restyle Lobby mobile assembly: stacked sections, progressive disclosure, bottom-anchored Start, sheet-based playlist/Spotify flows, roster as card list.
- Optional progress/stepper affordance.

**Validation gate**

- Full lobby flow (host + non-host) validated; Spotify/playlist sheets work; both themes; no feature loss.

### Phase 4 — Game Restyle: Chrome, Header, Docks, Menu

**Scope**

- Restyle non-timeline gameplay chrome: header/status strip, action docks (turn/reveal/challenge/finished), in-game menu (segmented tabs, sheet/full-screen), toasts, song info sheet.
- Bottom-anchored, thumb-zone action zone.

**Validation gate**

- Full game loop (place/challenge/reveal/finish) validated; feedback unambiguous; both themes; perf stable.

### Phase 5 — Game Timeline & Card System (highest risk, do carefully)

**Scope**

- Redesign timeline to the Spotify-card language and the **portrait grid** rule; keep `@dnd-kit` ownership of drag; Framer decorates outcomes only.
- Album-art-driven song cards; hidden-card modes; celebration/reveal motion polish.
- Portrait vs landscape compositions.

**Validation gate**

- Drag/placement UX validated on real devices (portrait + landscape); no drag regressions; celebration/reveal cheap and clear; both themes; perf profiled.

### Phase 6 — Polish, A11y, Cleanup

**Scope**

- Remove dead styles/tokens; audit contrast (AA) both themes; verify reduced-motion paths; safe-area + orientation sweep; device-range spot checks (SE → large Android).
- Confirm file-size limits; extract any CSS module that grew.

**Done**

- Split oversized CSS modules under the 500-line hard limit (`LobbySpotifySection`, `TimelinePanel`, `GamePage`, `LobbyPage`, action panels, playlist editor) via domain partials + `*Styles.ts` mergers.
- Pruned unused legacy semantic tokens (kept documented `color-success` / `color-info` contract keys).
- Normalized safe-area usage to `--safe-area-*` aliases.
- Light-theme contrast fixes (info modals, toggles, playlist edit meta, pleasant light palette).
- Quick Picks selected-song append/replace; reduced-motion coverage for Spotify panels/haptics.

**Validation gate**

- Full regression pass; a11y checks; `verify`/`build` green; docs updated.

### Phase 7 (Later, Separate) — Desktop Visual Pass

Out of scope for this overhaul. Desktop already consumes tokens; a dedicated effort later gives desktop richer layouts without touching mobile.

### Post-overhaul follow-ups

1. **Quick Picks selected-song add/replace** — ✅ Done in Phase 6.
2. **CSS module splits** — ✅ Done in Phase 6 (all former 500+ line modules split).
3. **Dead token prune** — ✅ Done in Phase 6 (legacy unused semantic tokens removed; design-system success/info kept).
4. **Remaining hex hardcodes** — Optional polish: migrate leftover brand/status hex in Spotify badges, AppShellMenu, RoomPrimaryActionButton to tokens where contrast pairs allow.
5. **Device-range spot checks** — Manual: SE → large Android, portrait + landscape, dark + light.

---

## 11. Definition Of Done (per screen)

- Uses tokens only (no raw color/size/duration).
- Mobile assembly restyled; desktop still renders without breakage.
- Portrait + landscape intentional; safe areas honored.
- Touch targets ≥48px, gaps ≥8px.
- Both themes pass AA contrast.
- Motion respects reduced-motion; only transform/opacity animated.
- No file exceeds soft limits; motion isolated per rules.
- `verify` + `build` green; feature parity confirmed.

---

## 12. Testing & Validation

- **Unit**: pure token/selector helpers; theme completeness (type-level + a runtime test asserting every semantic key present per theme).
- **Component**: primitive rendering + interaction (button variants, sheet open/close, segmented control).
- **Visual/manual**: per-phase device review (small/large phone, iOS + Android), portrait + landscape, dark + light.
- **Perf**: spot-profile gameplay (timeline drag, celebration) on a mid-range phone before/after Phase 5.
- **Regression**: keep existing tests green; add coverage for any new pure selectors.
- Standards: `npm run verify -w apps/web`, `npm run build -w apps/web` at every gate.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Token migration causes silent visual drift | Additive migration; per-component visual review; keep old values until adopted. |
| Timeline redesign regresses drag/perf | Isolate to Phase 5; keep `@dnd-kit` ownership; profile on real device; feature-flag if needed. |
| Desktop breakage from shared tokens | Desktop consumes tokens but isn't redesigned; validate desktop renders each phase. |
| CSS media-query creep returns | Enforce assembly-level structure; media queries only for in-assembly refinement. |
| Accent overuse (un-Spotify-like) | Lint discipline: accent reserved for primary/active/play; semantic colors for state; content color for cards. |
| File bloat | Respect soft limits; split CSS modules and components proactively. |

---

## 14. Open Questions / Decisions Needed

1. **Brand accent hue** — keep a vivid green (music/energetic, Spotify-adjacent) or choose a distinct TuneTrack accent? (Rule of single reserved accent holds either way.)
2. **Play/Join assemblies** — split into mobile/desktop now, or keep single-layout and just restyle?
3. **Onboarding stepper** — should Lobby become a true multi-step wizard, or stay a single scrollable stacked flow with disclosure?
4. **Haptics** — ship a haptics layer + preference now, or defer to polish?
5. **Landscape gameplay** — full alternate composition in Phase 5, or a "portrait-optimized, landscape-tolerated" first pass then enhance?
6. **Theme count at launch** — dark + light only, or also seed one extra theme to prove extensibility?

---

## 15. Quick Reference — Token Contract Summary

```
STRUCTURAL (theme-agnostic, emitted once):
  --space-0..12, --space-screen-gutter, --space-card-padding, --space-stack-gap
  --type-{display,title-lg,title-md,body-lg,body,label,caption,micro}-{size,leading,weight,tracking}
  --radius-{xs,sm,md,lg,xl,pill,circle}
  --motion-{quick,standard,screen,expressive}-{duration,ease}
  --z-{base,sticky,nav,overlay,sheet,dialog,toast,celebration}

SEMANTIC (per theme — the only thing new themes redefine):
  --color-bg-app, --color-surface, --color-surface-elevated, --color-surface-interactive
  --color-text-{primary,secondary,muted}
  --color-accent-primary, --color-accent-on
  --color-border-subtle
  --color-{success,danger,warning,info}
  --shadow-{none,raised,overlay,dialog}
  --gradient-{app-background,card-hidden,...}

COMPONENT (theme-agnostic, resolve to semantic):
  --button-*, --card-*, --sheet-*, --chip-*, --input-*, ...
```

---

*End of design specification. Implementation proceeds phase-by-phase; validate at each gate before advancing.*
