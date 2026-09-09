# 02 — Bundle Size and Startup Cost

> Addresses findings **F-01 – F-05**.
> Owning layers: `apps/web/vite.config.ts`, `apps/web/src/app`, `apps/web/src/features`,
> `packages/shared`, `packages/game-engine`.

## 1. The problem, quantified

Vite build output, 2026-09-08. The home screen's critical path is everything in
`index.html`'s `modulepreload` list plus the entry chunk:

| Asset | Raw | Gzip | Why it is on the critical path |
| --- | --- | --- | --- |
| `vendor-react-dom` | 130.18 kB | 41.84 kB | Unavoidable |
| `vendor-motion` | 116.84 kB | 39.01 kB | **Avoidable** — F-01 |
| `index` (entry) | 110.26 kB | 30.67 kB | Contains both i18n catalogues — F-03 |
| `vendor-router` | 61.57 kB | 21.06 kB | Data router for five routes |
| `vendor` | 12.44 kB | 4.87 kB | zustand and misc |
| `vendor-react` | 12.30 kB | 4.57 kB | Unavoidable |
| `index.css` | 10.49 kB | 3.07 kB | Global tokens and resets |
| **Total** | **454.08 kB** | **145.09 kB** | |

Then the route itself: `HomePage` 2.67 + `HomePageMobile` 3.62 + its CSS 4.73 +
`AppShellMenu` 3.51 + its CSS 7.88 + `AppPageShell`, `Button`, `StatusBanner`.
Approximately **480 kB raw / 152 kB gzip** to show a screen whose content is a logo,
three static cards and one button.

Loaded later but still oversized:

| Asset | Raw | Gzip | Cause |
| --- | --- | --- | --- |
| `LobbyRoomActions` JS | 79.84 kB | 22.28 kB | Spotify family hoisted into one chunk — F-04 |
| `LobbyRoomActions` CSS | 68.96 kB | 11.35 kB | `spotifyStyles.ts` barrel — F-04 |
| `GamePage` JS | 72.74 kB | 18.65 kB | |
| `vendor-router` | 61.57 kB | 21.06 kB | |
| `vendor-zod` | 54.88 kB | 12.61 kB | **Entirely unused** — F-02 |
| `TimelinePanel` JS | 54.76 kB | 14.83 kB | |
| `vendor-dnd` | 47.91 kB | 15.88 kB | Correctly deferred |
| `TimelinePanel` CSS | 41.96 kB | 7.67 kB | `timelineStyles.ts` barrel — F-04 |

## 2. Targets

| Metric | Baseline | Target | Stretch |
| --- | --- | --- | --- |
| Home critical path (gzip) | 145 kB | **95 kB** | 80 kB |
| `vendor-zod` in web bundle | 54.88 kB | **0** | 0 |
| Motion code on eager path (gzip) | 39.01 kB | **under 8 kB** | 0 |
| Largest CSS chunk | 68.96 kB | **under 20 kB** | 12 kB |
| Entry chunk (raw) | 110.26 kB | **under 55 kB** | 40 kB |

## 3. Phase 1 — Take framer-motion off the eager path

**Finding:** F-01. **Expected saving:** approximately 31 kB gzip from the critical path.

framer-motion v11 supports a split runtime: import the lightweight `m` component instead
of `motion`, wrap the app in `LazyMotion`, and load the feature bundle asynchronously.
`domAnimation` covers everything this app needs except layout animations;
`domMax` adds layout/drag. Only `AppShellMenuSheet` (`LayoutGroup`) and the timeline
celebration need more than `domAnimation`.

### Steps

1. Add a single feature-loading boundary in `apps/web/src/features/motion/`:
   - `MotionFeatureProvider.tsx` — wraps children in
     `<LazyMotion features={() => import("framer-motion").then(m => m.domAnimation)} strict>`.
     `strict` makes any accidental `motion.*` usage a build-time-visible runtime error,
     which is the guard that keeps the saving.
   - Mount it in `apps/web/src/app/App.tsx`, inside `I18nProvider`.
2. Convert every `motion.<tag>` usage in `apps/web/src` to `m.<tag>`. There are
   approximately 25 call sites; the change is mechanical and type-compatible.
3. For the two subtrees that need layout features, add a nested
   `<LazyMotion features={() => import(...).then(m => m.domMax)}>` inside the Game route
   and inside `AppShellMenuSheet`, so `domMax` lands in those route chunks, not the entry.
4. Re-check that `vendor-motion` no longer appears in `index.html`'s `modulepreload` list.

### Alternative considered and rejected for now

Replacing the page transition with CSS `@view-transition` would remove motion from the
shell entirely, but Safari support is still the limiting factor for an iOS-first party
game, and the app would need to keep the framer-motion path as a fallback anyway. Revisit
after the `LazyMotion` work if the target is missed.

### Acceptance

- [ ] `npm run build` shows no `vendor-motion` entry in `dist/index.html`.
- [ ] Home critical path (sum of preloaded chunks + entry, gzip) drops by at least 28 kB.
- [ ] Every page transition, dialog, sheet, toast and celebration still animates; verified
      by the overlay component tests from Doc 11 section 4 and a manual pass on the Game page.
- [ ] `prefers-reduced-motion` behaviour unchanged.

## 4. Phase 2 — Remove Zod from the web bundle

**Finding:** F-02. **Expected saving:** 12.61 kB gzip removed from the lobby/game path.

### Steps

1. Add `"sideEffects": false` to `packages/shared/package.json` and
   `packages/game-engine/package.json`. Both packages are pure modules — verified: no
   top-level DOM access, no global registration, no polyfills.
2. Add explicit subpath exports to `packages/shared/package.json` so consumers can state
   what they need:

   | Subpath | Contents | Consumers |
   | --- | --- | --- |
   | `.` | current barrel, retained for compatibility | existing code |
   | `./contracts` | `game/*`, `constants/gameplay`, `events/clientEvents`, `events/serverEvents` | web and server |
   | `./schemas` | `events/schemas` (Zod) | **server only** |
   | `./spotify` | `spotify/*` | web and server |

3. Repoint all 88 `from "@tunetrack/shared"` imports in `apps/web/src` to
   `@tunetrack/shared/contracts` or `/spotify`. Leave `apps/server` on the barrel or move
   it to explicit subpaths in the same change — the server is unaffected by size.
4. Add an ESLint `no-restricted-imports` rule for `apps/web` forbidding
   `@tunetrack/shared/schemas` and bare `zod`, so the saving cannot regress.

### Acceptance

- [ ] `npm run build` produces no `vendor-zod` chunk.
- [ ] `npm run typecheck` and `npm test` pass in all workspaces.
- [ ] Lint fails if a file under `apps/web/src` imports `zod` or `.../schemas`.

## 5. Phase 3 — Load one translation catalogue

**Finding:** F-03. **Expected saving:** approximately 20 kB raw from the entry chunk, plus
the boot-time parse of the unused catalogue.

### Steps

1. Replace the eager map in `apps/web/src/features/i18n/languages/index.ts` with a loader
   registry:

   - `languageLoaders: Record<LanguageId, () => Promise<string>>` using
     `() => import("./en.properties?raw").then(m => m.default)`.
   - A small static `languageMetadata` table (id, name, nativeName) so the language
     picker can render before any catalogue is fetched. Do **not** derive metadata from
     the parsed resource, which is what currently forces both files to load.

2. Make `I18nProvider` load the active catalogue:
   - hold `resource: TranslationResource | null` in state;
   - inline the **default** catalogue's most critical strings only if a measurable
     first-paint text flash appears — measure first, do not pre-optimise;
   - while `resource` is null, `t` returns the key. To avoid visible keys, gate the first
     paint on the catalogue: resolve it in `main.tsx` before `createRoot().render()`, or
     render the app-level skeleton (Doc 07 section 6) until it resolves. Prefer the
     latter, since it composes with the skeleton work.
   - cache loaded resources in a module-level `Map` so switching back and forth is free.

3. Keep `parseLanguageResource` as-is; it is pure and already tested-shaped. Add a unit
   test for comment lines, blank lines, `=` inside values, and CRLF input.

### A note on translation-key typing

`TranslationKey` is currently `string` (`features/i18n/i18n.types.ts` line 1), so a typo
in a key silently renders the key. Once catalogues are lazy this gets worse, because a
missing key and an unloaded catalogue look identical. Add a build-time step or a `.d.ts`
generated from `en.properties` giving `TranslationKey` a literal union, and a test
asserting `hu` has exactly the same key set as `en`. This is cheap and prevents a whole
defect class.

### Acceptance

- [ ] Only the active language's `.properties` content appears in the built assets for a
      single-language session (inspect chunk contents).
- [ ] Entry chunk drops by at least 18 kB raw.
- [ ] Switching language at runtime still works and persists to
      `tunetrack.language`.
- [ ] A test asserts `en` and `hu` key sets are identical.
- [ ] No raw translation keys are ever visible during startup.

## 6. Phase 4 — Dissolve the CSS-module barrels

**Finding:** F-04. **Expected saving:** the two large CSS chunks split into per-component
sheets; each component loads only its own styles.

### Steps

For each of the six barrels in F-04:

1. Delete the barrel module.
2. In each consuming component, import the specific CSS modules it actually uses, e.g.
   `TimelineSortableItem.tsx` imports `timelineCards.module.css` only; `TimelinePanel.tsx`
   imports `timelinePanelShell.module.css` plus whatever it genuinely references.
3. Where a component turns out to reference classes from three or four sheets, that is a
   signal the component is doing too much — record it, but do **not** refactor the
   component in this phase. Keep the change mechanical.
4. Where two components legitimately share a class, move that class into a small shared
   sheet (e.g. `timelineShared.module.css`) rather than re-creating a barrel.

**Order:** start with `gamePageActionPanelsStyles.ts` (2 modules, smallest blast radius),
then `playlistEditModalStyles.ts`, `timelineStyles.ts`, `gamePageStyles.ts`,
`lobbyPageStyles.ts`, and finally `spotifyStyles.ts` (5 modules, largest win).

**Guard:** add the duplicate-class-name test from Doc 11 section 4 *before* starting, so
that if a future change reintroduces a barrel the collision risk is caught.

### Acceptance

- [ ] No file under `apps/web/src` exports a spread-merged CSS-module object.
- [ ] Largest CSS chunk under 20 kB raw.
- [ ] Visual regression pass on Lobby (all Spotify tabs), Playlist editor, Game page
      (turn / challenge / reveal / finished), both themes, both layout modes.

## 7. Phase 5 — Route and vendor chunk hygiene

### 7.1 Reassess the router cost

`vendor-router` is 61.57 kB raw / 21.06 kB gzip for five routes. Two options:

- **Keep react-router-dom** and accept the cost. The `lazy()` route API in
  `apps/web/src/app/router.tsx` is already used well, and `useNavigationType` drives the
  page-transition direction. Recommended default.
- **Replace with a minimal router.** Saves roughly 18 kB gzip but touches
  `AppRoutes`, `router.tsx`, every `useNavigate`/`useParams`/`useSearchParams` call site
  (approximately 15 files), and the overlay-history work in Doc 06 which is easier with
  react-router's history primitives.

**Decision: keep react-router-dom.** Revisit only if the Phase 1-4 savings miss the
95 kB target. Record this in `docs/decision_log.md`.

### 7.2 Tighten `manualChunks`

The current `manualChunks` function in `apps/web/vite.config.ts` is sound. Two additions:

- Emit `vendor-zustand` separately from the catch-all `vendor` bucket so a zustand upgrade
  does not invalidate unrelated code.
- After Phase 2, remove the now-dead `zod` branch.

### 7.3 Production build flags

Add to `apps/web/vite.config.ts`:

- `build.target: "es2020"` — explicit rather than implicit, and safe for every browser
  that can run the Web Playback SDK.
- `esbuild.drop: ["debugger"]` and `esbuild.pure` for console methods, or an explicit
  `drop: ["console"]` **only after** the logging in `useSpotifyPlaybackSdk` has been
  converted to a proper diagnostics channel (Doc 08 section 5). Dropping console output
  while it is the only playback diagnostic would be a regression.
- `build.reportCompressedSize: false` if build time becomes a nuisance; keep it on while
  this programme is measuring.

### 7.4 Preload the right things, at the right time

`apps/web/src/app/preloadRoutes.ts` already warms the Lobby and Game chunks plus the
socket client. Extend it:

- Preload `AppShellMenuDialog` when the app shell mounts on the Game route, not on hover.
  This is the structural half of the F-29 flicker fix (Doc 06 section 6).
- Preload `vendor-dnd` and `TimelinePanel` when the lobby reaches `status === "lobby"`
  with a playlist imported, i.e. when a game start is plausible. `useLobbyPageController`
  already has the hook point (`preloadGameRuntime` in its effect).
- Do **not** preload the Spotify setup family; it is host-only and correctly deferred.

### 7.5 Service-worker caching strategy

`vite-plugin-pwa` currently runs with defaults plus `registerType: "autoUpdate"`. For a
party game where several phones open the app at once on a domestic connection, add an
explicit `workbox` config:

- precache the app shell and the active language catalogue;
- a `CacheFirst` runtime rule for `/*.png` icons and `/logo.png`, `/crown.png`;
- a `NetworkOnly` rule for `/socket.io/` and `/api/` so nothing realtime is ever served
  from cache;
- `cleanupOutdatedCaches: true`;
- `navigateFallback` to `index.html` with `navigateFallbackDenylist` covering `/api/`.

Note: album artwork comes from Spotify's CDN. Do **not** add a runtime cache rule for it
without compliance review — caching third-party media locally changes what the app stores
on a user's device.

### Acceptance for Phase 5

- [ ] Build flags explicit; no behaviour change.
- [ ] `docs/decision_log.md` records the router decision.
- [ ] Service-worker rules verified: with the app offline, the shell loads and shows a
      clear offline state; with the app online, no socket or API response is ever a cache hit.

## 8. Phase 6 — Remove dead weight

**Finding:** F-42 (see Doc 01 and Doc 09 section 6).

- Delete `apps/web/src/pages/HomePage/components/JoinRoomForm.tsx` (no importers).
- Prune the now-unused classes from `apps/web/src/pages/HomePage/HomePage.module.css`
  (409 lines; the desktop hero and top bar remain in use).
- Delete `apps/web/src/pages/LobbyPage/hooks/useLobbySpotify.ts` (two-line re-export) and
  repoint its importers to `./spotify/useLobbySpotify`.
- Move `roomCode.ts`, `homePageNavigation.ts` and `hooks/useRoomDirectory.ts` out of
  `pages/HomePage/` — they are imported by `PlayPage` and `JoinRoomPage`, so their current
  location is misleading. Doc 09 section 3 gives them their final home.

Per `AGENT.md` section 5, removal of pre-existing dead code is done here because it was
explicitly requested, and it is confined to this phase rather than mixed into behavioural
changes.

### Acceptance

- [ ] `npm run lint` reports no unused exports in the touched files.
- [ ] `npm run typecheck` passes.
- [ ] No visual change on Home, Play or Join.

## 9. Verification harness for this document

Add these to `apps/web/package.json` so every phase is measurable rather than asserted:

- `"analyze": "vite build --mode production && vite-bundle-visualizer"` — development
  dependency only, never shipped. Note: this is a local dev tool, not a hosted service, so
  no compliance review is required; if a hosted bundle-analysis service is ever proposed,
  raise it first.
- A committed `docs/plans/2026-09-stability-performance/bundle-baseline.md` capturing the
  table in section 1, updated at the end of each phase with the new numbers and the delta.

## 10. Risk register

| Risk | Mitigation |
| --- | --- |
| `LazyMotion strict` mode surfaces a missed `motion.*` at runtime, not build time | Convert all call sites in one change; the overlay component tests in Doc 11 section 4 exercise every animated surface. |
| Lazy i18n causes a flash of untranslated keys | Gate first paint on the catalogue; assert with a test that `t` never returns its own key for a known key after mount. |
| Dissolving CSS barrels drops a class that a component silently relied on | Do it one barrel at a time; visual regression pass per barrel; the classes are typed by CSS-modules so most misses are typecheck failures. |
| Subpath exports break the server or Vitest aliasing | `apps/server/vitest.config.ts` aliases `@tunetrack/shared` to source; add matching aliases for the new subpaths in the same change. |
