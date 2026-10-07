# 10 — Bundle Size and Startup Cost

> **Status (2026-10-07):** Phases 1–4 shipped 2026-10-07 (`05` D1–D4); Phase 5 shipped except
> §7.4 preloads (`05` D5). Phase 6 shipped on 2026-09-17. §9 shipped on 2026-10-07 as `05` D0
> (`measure:bundle`, `bundle-baseline.md`).
> **Folded from** `docs/plans/2026-09-stability-performance/02-bundle-and-startup.md` on
> 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
> Addresses finding **F-14** (startup) and **T-02** (boundary lint) of `01-review-findings.md`.
> The old audit numbers F-01–F-05 are not used in this document.
> Owning layers: `apps/web/vite.config.ts`, `apps/web/src/app`, `apps/web/src/features`,
> `packages/shared`, `packages/game-engine`.
> Phase 5 of the review programme (performance plan, see `00-index.md` §4) sets the binding
> numeric budgets and the measurement protocol; this document stays the work breakdown.
>
> **Binding budgets, order and corrections (2026-10-07):** `05-performance-and-robustness-plan.md` §2 (budgets), §8 (rollout order), §9 (corrections to this document). Where they differ, `05` wins.

## 1. The problem, quantified

**Measured 2026-09-08; re-measure before starting Phase 1.** The i18n catalogues have since
grown from 615 to 692 lines each, and the review baseline of 2026-10-06 (`00-index.md` §3)
measured the eager home-screen JS + CSS at 462 kB raw / ~147 kB gzip, so nothing below has
improved.

Vite build output, 2026-09-08. The home screen's critical path is everything in
`index.html`'s `modulepreload` list plus the entry chunk:

| Asset              | Raw           | Gzip          | Why it is on the critical path          |
| ------------------ | ------------- | ------------- | --------------------------------------- |
| `vendor-react-dom` | 130.18 kB     | 41.84 kB      | Unavoidable                             |
| `vendor-motion`    | 116.84 kB     | 39.01 kB      | **Avoidable** — Phase 1                 |
| `index` (entry)    | 110.26 kB     | 30.67 kB      | Contains both i18n catalogues — Phase 3 |
| `vendor-router`    | 61.57 kB      | 21.06 kB      | Data router for five routes             |
| `vendor`           | 12.44 kB      | 4.87 kB       | zustand and misc                        |
| `vendor-react`     | 12.30 kB      | 4.57 kB       | Unavoidable                             |
| `index.css`        | 10.49 kB      | 3.07 kB       | Global tokens and resets                |
| **Total**          | **454.08 kB** | **145.09 kB** |                                         |

Then the route itself: `HomePage` 2.67 + `HomePageMobile` 3.62 + its CSS 4.73 +
`AppShellMenu` 3.51 + its CSS 7.88 + `AppPageShell`, `Button`, `StatusBanner`.
Approximately **480 kB raw / 152 kB gzip** to show a screen whose content is a logo,
three static cards and one button.

Loaded later but still oversized:

| Asset                  | Raw      | Gzip     | Cause                                           |
| ---------------------- | -------- | -------- | ----------------------------------------------- |
| `LobbyRoomActions` JS  | 79.84 kB | 22.28 kB | Spotify family hoisted into one chunk — Phase 4 |
| `LobbyRoomActions` CSS | 68.96 kB | 11.35 kB | `spotifyStyles.ts` barrel — Phase 4             |
| `GamePage` JS          | 72.74 kB | 18.65 kB |                                                 |
| `vendor-router`        | 61.57 kB | 21.06 kB |                                                 |
| `vendor-zod`           | 54.88 kB | 12.61 kB | **Entirely unused** — Phase 2                   |
| `TimelinePanel` JS     | 54.76 kB | 14.83 kB |                                                 |
| `vendor-dnd`           | 47.91 kB | 15.88 kB | Correctly deferred                              |
| `TimelinePanel` CSS    | 41.96 kB | 7.67 kB  | `timelineStyles.ts` barrel — Phase 4            |

## 2. Targets

Working targets from 2026-09, **superseded** by the binding budgets in
`05-performance-and-robustness-plan.md` §2.1 (eager gate ≤ 110 kB gzip; 95 kB is a stretch goal).

| Metric                           | Baseline  | Target          | Stretch |
| -------------------------------- | --------- | --------------- | ------- |
| Home critical path (gzip)        | 145 kB    | **95 kB**       | 80 kB   |
| `vendor-zod` in web bundle       | 54.88 kB  | **0**           | 0       |
| Motion code on eager path (gzip) | 39.01 kB  | **under 8 kB**  | 0       |
| Largest CSS chunk                | 68.96 kB  | **under 20 kB** | 12 kB   |
| Entry chunk (raw)                | 110.26 kB | **under 55 kB** | 40 kB   |

## 3. Phase 1 — Take framer-motion off the eager path

**Shipped 2026-10-07** as `05` D1. Components render `m.*`; `features/motion/MotionFeatureProvider`
loads `domAnimation` after first paint and `MotionLayoutFeatures` adds `domMax` in the Game and
Lobby routes. Eager path 148.1 → 114.9 kB gzip. Proof: `MotionFeatureProvider.test.tsx`,
`test/guards/lazyMotionSites.test.ts`, `bundle-baseline.md`. Replacing the page transition with
CSS view transitions stays rejected while Safari support is incomplete.

## 4. Phase 2 — Remove Zod from the web bundle

**Shipped 2026-10-07** as `05` D2. `packages/shared` has `sideEffects: false` and a `./client`
entry without the Zod schemas; the web imports only that entry, enforced by
`no-restricted-imports` in `eslint.config.js`. No `vendor-zod` chunk is emitted.

## 5. Phase 3 — Load one translation catalogue

**Shipped 2026-10-07** as `05` D3. One chunk per catalogue; `main.tsx` loads the active one
behind the skeleton before mounting; the key-parity guard is strict and also checks the static
language metadata. Entry 142.5 → 51.1 kB raw. Proof: `I18nProvider.test.tsx`,
`parseLanguageResource.test.ts`, `i18nKeyParity.test.ts`.

Open: `TranslationKey` is still `string`; a literal union generated from `en.properties` would
catch key typos at build time.

## 6. Phase 4 — Dissolve the CSS-module barrels

**Shipped 2026-10-07 (`05` D4).** The six barrels are deleted and each component imports the
sheets it uses; the playlist editor became a lazy chunk. Largest CSS 68.8 → 40.3 kB; the
20 kB gate became ≤ 42 kB (decision 18, `05` §9). Proof: `noCssBarrels.test.ts` with an empty
allowlist, `measure:bundle`. The visual pass on Lobby, editor and Game is a manual check.

## 7. Phase 5 — Route and vendor chunk hygiene

### 7.1 Reassess the router cost

`vendor-router` is 61.57 kB raw / 21.06 kB gzip for five routes. Two options:

- **Keep react-router-dom** and accept the cost. The `lazy()` route API in
  `apps/web/src/app/router.tsx` is already used well, and `useNavigationType` drives the
  page-transition direction. Recommended default.
- **Replace with a minimal router.** Saves roughly 18 kB gzip but touches
  `AppRoutes`, `router.tsx`, every `useNavigate`/`useParams`/`useSearchParams` call site
  (approximately 15 files), and the overlay-history work in
  `14-navigation-and-overlays.md`, which is easier with react-router's history primitives.

**Decision: keep react-router-dom.** Revisit only if the Phase 1–4 savings miss the
95 kB target. Recorded in `docs/decision_log.md` (2026-10-06).

### 7.2 Tighten `manualChunks`

**Shipped 2026-10-07 (`05` D2, D5).** `vendor-zustand` is its own chunk; the `zod` branch went
with D2.

### 7.3 Production build flags

**`build.target: "es2020"` shipped 2026-10-07 (`05` D5).** Dropping `console` output waits
for the playback diagnostics channel (`16` §5); `reportCompressedSize` stays on.

### 7.4 Preload the right things, at the right time

`apps/web/src/app/preloadRoutes.ts` already warms the Lobby and Game chunks plus the
socket client. Extend it:

- Preload `AppShellMenuDialog` when the app shell mounts on the Game route, not on hover.
  This is the structural half of the menu-flicker fix (`14-navigation-and-overlays.md` §6).
- Preload `vendor-dnd` and `TimelinePanel` when the lobby reaches `status === "lobby"`
  with a playlist imported, i.e. when a game start is plausible. `useLobbyPageController`
  already has the hook point (`preloadGameRuntime` in its effect).
- Do **not** preload the Spotify setup family; it is host-only and correctly deferred.

### 7.5 Service-worker caching strategy

**Shipped 2026-10-07 (`05` D5).** Workbox: `cleanupOutdatedCaches`, `navigateFallback` to
`index.html` with `/api/` and `/socket.io/` denied, `NetworkOnly` for both, `CacheFirst`
(32 entries) for same-origin images only; the shell and both catalogue chunks are precached.
Spotify artwork is not cached (third-party media; compliance review).

### Acceptance for Phase 5

- [x] Build flags explicit; no behaviour change (`05` D5).
- [ ] Service-worker rules verified: with the app offline, the shell loads and shows a
      clear offline state; with the app online, no socket or API response is ever a cache hit.

## 8. Phase 6 — Remove dead weight

**Shipped 2026-09-17.** `JoinRoomForm`, its dedicated Home CSS and the lobby Spotify re-export shim were deleted; room navigation and directory ownership moved to `features/rooms` (`17-room-and-player-identity-flow.md`); proven by `npm run lint`/`npm run typecheck` and a manual Home/Play/Join regression pass.

## 9. Verification harness for this document

**Shipped 2026-10-07** as `05` D0: `npm run measure:bundle -w @tunetrack/web`
(`apps/web/scripts/measure-bundle.mjs`, Node built-ins only, no visualizer dependency) and
`bundle-baseline.md`, which every phase with a bundle budget extends by one row.

## 10. Risk register

| Risk                                                                             | Mitigation                                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `LazyMotion strict` mode surfaces a missed `motion.*` at runtime, not build time | Convert all call sites in one change; the overlay component tests in `19-testing-strategy.md` §4 exercise every animated surface.          |
| Lazy i18n causes a flash of untranslated keys                                    | Gate first paint on the catalogue; assert with a test that `t` never returns its own key for a known key after mount.                      |
| Dissolving CSS barrels drops a class that a component silently relied on         | Do it one barrel at a time; visual regression pass per barrel; the classes are typed by CSS-modules so most misses are typecheck failures. |
| Subpath exports break the server or Vitest aliasing                              | `apps/server/vitest.config.ts` aliases `@tunetrack/shared` to source; add matching aliases for the new subpaths in the same change.        |
