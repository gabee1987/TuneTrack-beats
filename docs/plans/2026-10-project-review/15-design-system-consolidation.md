# 15 — Design System Consolidation

> **Status (2026-10-06):** Phases 1–5 open (all legacy button, input and setting components still present; 94 hex literals in CSS modules; `Skeleton` used only by `JoinRoomPage` and `DesignSystemPage`; the recovery dialog has one message). Phase 6 partial: `/dev/ui` exists, the component rules were written into `docs/rules/design_system.md`, and the hex and barrel guard tests exist with pending-migration allowlists.
> **Folded from** `docs/plans/2026-09-stability-performance/07-design-system-consolidation.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Review findings: F-07 (five button systems) and F-05 (z-index literals) are owned by Phase 5 of the review programme for budgets; this document holds the work breakdown. Deleting the two zero-importer button files is dead-code work under review Phase 6 (F-07). T-04 (shared UI has no render tests) is the test counterpart. See `00-index.md` §4.
> Owning layers: `apps/web/src/features/ui`, `apps/web/src/features/theme`,
> `apps/web/src/pages/**/*.module.css`.

The product requirement is "a robust, consistent shared design system, so similar types of
UI elements have the same or similar design and feel". The token layer already exists and
is good. The gap is that several parallel component systems coexist and, at audit time
(2026-09-08), only 9 of 69 page components used the intended one.

## 1. What already exists and should be kept

`apps/web/src/features/theme/` is well-built and is the foundation to build on:

- `tokens/primitives.ts` — raw scales: space, radius, type, motion duration/easing, z-index,
  touch-target size. Correct three-tier structure (primitive to semantic to component).
- `tokens/components.ts` — component tokens resolving to semantic vars.
- `darkThemeTokens.ts` / `lightThemeTokens.ts` — `SemanticColorTokens` makes the two themes
  key-identical **at compile time**, which is exactly the "add a theme by swapping a token
  set" property `CLAUDE.md` asks for.
- `themeRegistry.ts` + `applyTheme` — single application point.
- `tokenContract.ts` — the public surface.
- `themeTokens.test.ts` and `primitives.contract.test.ts` — existing guards.

`apps/web/src/features/ui/primitives/` is the intended component layer and already has
`Avatar`, `Button`, `Card`, `Chip`, `Dialog`, `EmptyState`, `IconButton`, `ListRow`,
`SegmentedControl`, `Skeleton`. This is the target; the work is adoption and gap-filling,
not redesign.

`apps/web/src/pages/DesignSystemPage/DesignSystemPage.tsx` exists as a dev-only route at
`/dev/ui`. It is the acceptance surface for this document.

The guard tests in `apps/web/src/test/guards/` — `noHardcodedColors.test.ts`,
`noCssBarrels.test.ts`, `i18nKeyParity.test.ts` — exist with pending-migration allowlists.
Phases 3 and 6 shrink those allowlists; they do not create the tests.

## 2. Phase 1 — Collapse the button systems · **S2** · open

**Review finding:** F-07. This directly fixes the reported mismatch between the player
remove button, the token remove control and the close-room button.

### 2.1 Current state

| System                    | Location                                                                                   | Variants                                 | Call sites                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------- |
| `Button`                  | `features/ui/primitives/Button.tsx` + `Button.module.css`                                  | `variant`, `size`, `fullWidth`, `haptic` | 9 page components at audit time                                   |
| `ActionButton`            | `features/ui/ActionButton.tsx` + `FormControls.module.css`                                 | `danger`, `neutral`, `primary`           | Playlist editor, track details, room reset                        |
| `RoomPrimaryActionButton` | `features/ui/RoomPrimaryActionButton.tsx`                                                  | one look                                 | **0 importers** (dead; delete under review Phase 6)               |
| `RoomDangerActionButton`  | `features/ui/RoomDangerActionButton.tsx`                                                   | wraps `ActionButton variant="danger"`    | **0 importers** (dead; delete under review Phase 6)               |
| `ActionDock` buttons      | `pages/GamePage/components/ActionDock.tsx` `PrimaryActionButton` / `SecondaryActionButton` | floating primary / secondary             | Game page action dock                                             |
| Ad-hoc                    | `pages/GamePage/gamePageMenu.module.css` `.menuActionButton`, `.menuKickPlayerButton`      | n/a                                      | Game menu player rows (`GameMenuPlayerItem` still uses them, B11) |

### 2.2 Target

One `Button` with an explicit, closed variant set. Audit the systems' visual designs
first and pick the intended look per variant — this is a product decision, not a mechanical
merge, and it should be made once and written down.

| Variant     | Use                                                  | Replaces                                                                                             |
| ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `primary`   | The main affirmative action on a surface             | `Button` default, `RoomPrimaryActionButton`, `ActionDock` primary                                    |
| `secondary` | Alternative action alongside a primary               | `Button variant="secondary"`, `ActionButton variant="neutral"`, `ActionDock` secondary               |
| `tertiary`  | Low-emphasis inline action                           | ad-hoc `.inlineButton` styles                                                                        |
| `danger`    | Destructive: close room, remove player, remove token | `ActionButton variant="danger"`, `RoomDangerActionButton`, `.menuKickPlayerButton`                   |
| `spotify`   | Spotify-branded connect action only                  | the hardcoded `#1ed760` blocks in `spotifySetupShell.module.css` and `playlistEditChrome.module.css` |

Sizes: `sm` / `md` / `lg`, all meeting the 48 px minimum touch target from
`touchTargetSize` (`--size-touch-target`) on coarse pointers regardless of nominal size.

Props to keep: `fullWidth`, `haptic` (wires `triggerPressHaptic`), `loading` (new — needed
by the ack-driven pending states from `13-network-protocol-and-resilience.md` §4).

### 2.3 Migration order

1. Extend `Button` with the `tertiary` and `spotify` variants and a `loading` state.
2. ~~Delete `RoomPrimaryActionButton` and `RoomDangerActionButton` with their stylesheets.~~
   Done 2026-10-09 (`06` W1).
3. Replace `ActionButton` usages with `Button`; delete `ActionButton.tsx`. Keep
   `FormControls.module.css` only for the input styles it also holds, then move those into
   the input primitives (section 3) and delete it too.
4. Replace the ad-hoc game-menu buttons with `Button variant="danger" size="sm"`, deleting
   `.menuActionButton` and `.menuKickPlayerButton`.
5. Rebuild the `ActionDock` primary/secondary buttons on `Button`, keeping the floating
   layout in the dock's own stylesheet.
6. Add an ESLint `no-restricted-imports` rule blocking imports of the deleted modules so
   they cannot come back (no such rule exists today, T-02).

### 2.4 Icon buttons

`features/ui/primitives/IconButton.tsx` and `features/ui/CloseIconButton.tsx` are the same
control twice. Keep `IconButton`; give it a `close` convenience so callers do not each
inline the same X path:

- Move the X SVG into a single `features/ui/icons/` module (there are at least four
  hand-inlined copies today: `Dialog.tsx`, `CloseIconButton.tsx`,
  `AppShellMenuSheet.tsx`, and the playlist editor).
- Replace all `CloseIconButton` usages with `IconButton` plus that icon; delete
  `CloseIconButton.tsx` and its stylesheet.

### Acceptance

- [ ] Exactly one button component and one icon-button component exist under
      `features/ui`.
- [ ] The player remove button, the token remove control and the close-room button are all
      `Button variant="danger"` and are visually identical at the same size.
- [ ] Lint blocks reintroduction of the removed modules.
- [ ] `/dev/ui` renders every variant and size, in both themes, with focus and disabled
      states.
- [ ] `primitives.contract.test.ts` extended to assert the variant set; `Button` and
      `IconButton` have render tests (T-04).

## 3. Phase 2 — Fill the primitive gaps · **S2** · open

Several controls are still bespoke per page. Promote them so pages stop styling from
scratch.

| Missing primitive | Currently                                                                                                        | Action                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextField`       | `features/ui/TextInput.tsx` (unstyled passthrough) + per-page label/field CSS in at least six files              | Promote to `primitives/TextField` with label, hint, error, and required affordances built in.                                                                                                |
| `NumberStepper`   | `features/ui/RangeField.tsx` and `gameMenu/TokenAdjustButtons.tsx` solve the same problem twice                  | One primitive with `min`/`max`/`step`, used by both.                                                                                                                                         |
| `Select`          | `features/ui/SelectInput.tsx` plus `pages/LobbyPage/components/AdaptiveSelect.tsx` and `AdaptiveSelectSheet.tsx` | Keep the adaptive behaviour (native select on desktop, sheet on mobile) but move it into `primitives/Select` so it is available everywhere.                                                  |
| `Toggle`          | `features/ui/ToggleSwitch.tsx` + `ToggleField.tsx`                                                               | Already close to a primitive; move under `primitives/` unchanged.                                                                                                                            |
| `SettingRow`      | `features/ui/SettingField.tsx` (431 lines of CSS)                                                                | This is the single most reused layout in the app (settings, lobby, game menu). Promote it and let it compose `TextField` / `Toggle` / `NumberStepper` / `Select` rather than restyling them. |
| `Banner`          | `features/ui/StatusBanner.tsx`                                                                                   | Add `tone` (`info` / `warning` / `error` / `success`) so the connection banner from `13-network-protocol-and-resilience.md` §5 and the error banners share one look.                         |
| `ProgressBar`     | inline in `gameMenu/PlaybackTabContent.tsx`                                                                      | Needed by playback and by the challenge countdown.                                                                                                                                           |

`SettingField.module.css` at 431 lines exceeds the utility soft limit in `CLAUDE.md` and
should be split by concern (row layout, control slots, sheet variant) as part of the
promotion.

### Acceptance

- [ ] No page defines its own label, field, stepper, toggle or select styles.
- [ ] Each promoted primitive is rendered on `/dev/ui` with every state.
- [ ] Each has a component test covering keyboard interaction and the disabled state.
- [ ] No primitive stylesheet exceeds 200 lines.

## 4. Phase 3 — Retire hardcoded values · **S3** · open

94 hardcoded hex literals (unchanged since the audit) and roughly 300 raw-pixel spacing
values remain, against `CLAUDE.md`'s explicit requirement that colours, surfaces and
shadows come from tokens.

### 4.1 Colours

Work file by file, worst first:

| File                                                              | Hex count              |
| ----------------------------------------------------------------- | ---------------------- |
| `pages/LobbyPage/components/spotify/spotifySetupShell.module.css` | 10                     |
| `pages/GamePage/gamePagePlayback.module.css`                      | 9                      |
| `features/ui/RoomPrimaryActionButton.module.css`                  | 9 (deleted in Phase 1) |
| `features/loading/AppLoadingOverlay.module.css`                   | 9                      |
| `pages/LobbyPage/components/spotify/spotifyDiscovery.module.css`  | 7                      |
| `pages/LobbyPage/components/playlistEditList.module.css`          | 5                      |
| `pages/LobbyPage/components/playlistEditChrome.module.css`        | 5                      |
| `pages/GamePage/gamePageMenu.module.css`                          | 5                      |
| `pages/GamePage/components/timelineCards.module.css`              | 5                      |
| remaining 12 files                                                | 1-4 each               |

Three categories, three treatments:

- **Brand colours that are genuinely fixed** (`#1ed760`, `#1db954` — Spotify green;
  `#06100a` — its on-colour). These are third-party brand values and must not shift with
  the theme. Give them dedicated semantic tokens (`--color-brand-spotify`,
  `--color-brand-spotify-on`) defined identically in both themes, so they are still tokens
  and still auditable.
- **Semantic colours with an existing token** (`#dc2626`, `#ef4444`, `#f87171` are all
  "danger"; `#4ade80`, `#8ff2c0` are "success"). Map to the existing semantic token and
  delete the literal. Where the shade genuinely differs, add the missing semantic token
  rather than keeping a literal.
- **Accent gradients and decorative colours** (`#ff8a3d`, `#8b5cff`, `#ff9daf`, `#ffd56a`).
  These are the playful accents `CLAUDE.md` asks for. Give them an explicit accent ramp in
  the token set (`--color-accent-warm`, `--color-accent-violet`, `--color-accent-rose`, ...)
  so a future theme can restyle the whimsy without touching components.

`#ffffff` / `#fff` / `#000` inside `color-mix(...)` are a special case: they are being used
as mixing endpoints, not as colours. Introduce `--color-mix-light` and `--color-mix-dark`
so even those are theme-controlled — in a future high-contrast or sepia theme, mixing
toward pure white is wrong.

### 4.2 Spacing and radii

Roughly 300 raw-pixel values. Convert to `--space-*` and `--radius-*` where a token exists
at that value; where it does not, either round to the nearest token or add a token if the
value is used three or more times. Do not add a token for a one-off. Retire the legacy
`--radius-card/panel/input/button` aliases still declared in `globals.css` once no module
references them.

Concentrations: `spotifySetupShell` (32), `spotifyPanels` (30), `lobbySettings` (29),
`HomePage.module.css` (29 — mostly deleted in `10-bundle-and-startup.md` §8),
`playlistEditChrome` (23).

### 4.3 Enforcement

The guards already exist (`19-testing-strategy.md` §4):

- `apps/web/src/test/guards/noHardcodedColors.test.ts` globs `apps/web/src/**/*.module.css`
  and asserts no hex literal outside an allowlist of files pending migration. Shrink the
  allowlist to empty as the phase progresses — this makes the phase self-tracking.
- extend `themeTokens.test.ts` to assert every new semantic token exists in both themes
  (the existing `SemanticColorTokens` type already enforces this at compile time; the test
  documents the intent for readers).

### Acceptance

- [ ] Zero hex literals in `apps/web/src/**/*.module.css`; the `noHardcodedColors`
      allowlist is empty.
- [ ] `--space-*` / `--radius-*` used for all padding, margin, gap and border-radius where
      a token matches.
- [ ] Both themes visually verified on every screen.
- [ ] A third theme can be added by supplying one `SemanticColorTokens` object; prove it by
      adding a throwaway high-contrast theme on a branch and confirming no component file
      changes.

## 5. Phase 4 — Consistent dialog, sheet and recovery surfaces · **S2** · open

Depends on `14-navigation-and-overlays.md` Phase 3 (the overlay host).

Once the host exists, three shells cover every overlay:

| Shell             | Use                                            | Replaces                                                                                                  |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Dialog`          | Centred modal with title, body, actions        | `primitives/Dialog`, kick confirmation, `SongInfoModal`, `RoomResetModal`                                 |
| `Sheet`           | Edge-anchored panel; `side` = `bottom` / `end` | `BottomSheet`, `AppShellMenuSheet`, `PlaylistEditModal`, `SpotifySetupModal`, `PlaylistTrackDetailsSheet` |
| `BlockingOverlay` | Non-dismissible full-screen state              | `AppLoadingOverlay`, recovery modal                                                                       |

Each shell owns its own scrim, safe-area padding, enter/exit motion (from the shared
motion tokens), header layout and action-row layout. Callers supply content only.

### The recovery-dialog contract

`RoomResetModal` currently serves several distinct situations with one message
("the room was reset"). `13-network-protocol-and-resilience.md` identifies at least four:

| Reason                 | Message intent                                     |
| ---------------------- | -------------------------------------------------- |
| `room_closed_by_host`  | The host ended the game.                           |
| `room_not_found`       | This room no longer exists.                        |
| `game_already_started` | The game is already running and your seat is gone. |
| `server_restarted`     | The server restarted; rooms did not survive.       |

Give the recovery overlay a `reason` prop and four i18n key sets in both catalogues. Same
component, honest copy. This is a small change that removes a real source of user confusion
and does not need to wait for the shells.

### Acceptance

- [ ] Three shells; no bespoke modal markup in any page.
- [ ] All four recovery reasons have distinct localised copy in `en` and `hu`.
- [ ] `/dev/ui` renders all three shells and all four recovery reasons.

## 6. Phase 5 — Real skeleton loading for every page · **S2** · open

The product requirement is "proper skeleton loading for all pages to get the correct page
structure when loading". Today `Skeleton` is used only by `JoinRoomPage` and
`DesignSystemPage`.

### 6.1 Principles

- A skeleton mirrors the **final layout** of the page it replaces: same regions, same
  approximate sizes, same safe-area handling. A generic placeholder is worse than nothing,
  because it causes a second layout shift when the real content arrives.
- A skeleton is a **structure**, not a spinner. Use `Skeleton` from primitives.
- Skeletons obey `prefers-reduced-motion`: the shimmer stops, the blocks remain.
- Each skeleton lives next to the page it mirrors, so the two drift together.
- Skeletons are `aria-busy="true"` with a visually hidden live-region label, which
  `JoinRoomPage` already does correctly and should be the pattern.

### 6.2 Per-page work

| Page            | Loading trigger today                                     | Skeleton to build                                                                                                                                                                    |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home            | `AppRouteFallback` (generic)                              | `HomePageSkeleton` — logo block, three feature cards, one action button. Mobile and desktop variants.                                                                                |
| Play            | `AppRouteFallback`                                        | `PlayPageSkeleton` — header, two form blocks, divider, room list of three rows.                                                                                                      |
| Join            | already has skeletons for room facts                      | Extend to cover the whole card during route load.                                                                                                                                    |
| Lobby           | `AppRouteFallback`, then a live socket wait with no state | `LobbySkeleton` — header, player list of two rows, settings section, Spotify section, action dock. This is the highest-value one: the lobby waits on a socket round trip every time. |
| Game            | plain `<h1>{t("game.loading")}</h1>`                      | `GameSkeleton` — header chip row, status badge, timeline row of four card blocks, action dock. Replaces the text state entirely.                                                     |
| Playlist editor | spinner + text (`.loadingState`)                          | `PlaylistEditorSkeleton` — sort bar plus eight row skeletons, replacing the spinner.                                                                                                 |
| Spotify panels  | mixed spinners                                            | Row skeletons matching each result list.                                                                                                                                             |

### 6.3 Route-level wiring

- Replace `AppRouteFallback` as the universal Suspense fallback with a per-route fallback,
  supplied at the route definition in `apps/web/src/app/router.tsx`. React Router's `lazy`
  route objects can carry a `HydrateFallback`/element per route, so each route names its own
  skeleton.
- Keep a minimal `AppShellSkeleton` for the app's very first paint (before the router or the
  i18n catalogue resolves — see `10-bundle-and-startup.md` §5).
- Introduce a minimum display time of roughly 150 ms with a delayed appearance of roughly
  100 ms, so a fast load shows nothing at all and a slow load shows a stable skeleton. A
  skeleton that flashes for 30 ms is worse than no skeleton; this is the standard remedy and
  belongs in a small shared `useDelayedFlag` hook, not in each page.

### Acceptance

- [ ] Every route has a skeleton whose region layout matches its loaded state; verified by
      screenshot comparison at the same viewport with the shimmer disabled.
- [ ] No page shows a bare text "Loading" string.
- [ ] Cumulative layout shift between skeleton and loaded state is visually imperceptible;
      spot-check with DevTools' layout-shift regions.
- [ ] A load faster than 100 ms shows no skeleton at all.
- [ ] All skeletons stop animating under `prefers-reduced-motion`.

## 7. Phase 6 — Make the design system discoverable · partially shipped

The system only stays consistent if it is easy to see and hard to bypass.

- **Promote `/dev/ui`.** Shipped as a route: it is `import.meta.env.DEV`-gated in
  `router.tsx`. Still to do: expand it into the reference gallery — every primitive, every
  variant, every state, both themes, both layout modes, with the token name shown next to
  each swatch — and make "did you add it to `/dev/ui`?" part of the review checklist.
- **Component rules.** Shipped: the rules (which primitive to use for which job, when a new
  primitive is justified — used in three or more places — and that page CSS may lay out but
  may not restyle a primitive) live in `docs/rules/design_system.md`, not in
  `docs/rules/frontend_engineering_rules.md` as originally planned. Keep them there; the
  frontend rules carry a pointer only.
- **Guard with tests** rather than review discipline alone. Shipped with allowlists:
  `noHardcodedColors.test.ts`, `noCssBarrels.test.ts`. Open: `zIndexScale.test.ts`
  (`14-navigation-and-overlays.md` §2.3), the duplicate-class test, and the ESLint
  `no-restricted-imports` rules (T-02). The remaining work is to shrink the allowlists to
  empty and add the missing two guards.

## 8. Sequencing and risk

Phases 1 and 2 were planned as prerequisites for the room flow and the hint system; both
shipped without them, so nothing downstream is blocked. Phase 4 depends on the overlay host
(`14-navigation-and-overlays.md` Phase 3). Phases 3, 5 and 6 can proceed in parallel with
other work; review Phase 5 fixes the order against its budgets.

| Risk                                                                            | Mitigation                                                                                                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merging button systems changes the look of a screen the owner liked             | Decide the target look per variant **before** migrating, capture before/after screenshots of every affected screen, and review them as a set rather than per commit. |
| Deleting `ActionButton` breaks a call site with an unusual `className` override | Each call site is migrated individually; CSS-modules typing surfaces most breakages at typecheck.                                                                    |
| Token migration shifts colours subtly across many screens                       | Migrate one file per commit with a screenshot pair; the semantic mapping is documented in section 4.1 so reviewers can check intent rather than pixels.              |
| Skeletons drift from real layouts over time                                     | Skeleton lives beside its page; add a review-checklist item that a layout change updates its skeleton.                                                               |
| `/dev/ui` rots                                                                  | It is the acceptance surface for every phase here, so it is exercised continuously; a component test that renders it and asserts no error keeps it compiling.        |
