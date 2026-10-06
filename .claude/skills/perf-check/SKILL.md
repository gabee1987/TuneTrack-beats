---
name: perf-check
description: Measure TuneTrack web bundle size and runtime render cost before and after a change using the repository's protocol (vite build output per chunk, gzip, eager path, React Profiler, chunk preloads). Use when a change touches apps/web/vite.config.ts, lazy routes, features/motion, i18n loading, timeline/drag rendering, or when a plan phase has a numeric acceptance criterion.
---

# perf-check

Normative targets: `docs/plans/2026-10-project-review/10-bundle-and-startup.md` §1–§2 and
`11-runtime-and-motion-performance.md` §1. Phase 5 of the review programme (document `05`)
will set binding budgets; until it lands, use the working targets in plan 10 §2.

## 1. Bundle — measure before, measure after

```
npm run build -w @tunetrack/web
```

Vite prints every chunk with raw and gzip size. Record these rows (names come from
`manualChunks` in `apps/web/vite.config.ts` and the lazy routes in `apps/web/src/app/router.tsx`):

| Chunk                                               | Why it matters                                 |
| --------------------------------------------------- | ---------------------------------------------- |
| `index` (entry) + `index.css`                       | contains both i18n catalogues today            |
| `vendor-react`, `vendor-react-dom`, `vendor-router` | unavoidable eager path                         |
| `vendor-motion`                                     | must leave the eager path (plan 10 Phase 1)    |
| `vendor-zod`                                        | must be absent (plan 10 Phase 2)               |
| `vendor-dnd`, `vendor-tanstack`, `vendor-socket`    | must stay lazy                                 |
| `LobbyPage`, `GamePage`, `TimelinePanel` JS and CSS | largest route chunks; CSS barrels inflate them |

**Eager home path** = entry JS + entry CSS + every chunk the HTML preloads or `App.tsx`
imports statically. Baseline 2026-10-06: ~462 kB raw / ~147 kB gzip. Working targets: home
critical path ≤ 95 kB gzip, motion on eager path < 8 kB gzip, largest CSS chunk < 20 kB,
entry < 55 kB raw. Report a before/after table; a regression over 2 kB gzip on the eager path
needs a justification in the report.

No `analyze` script or visualizer exists yet (plan 10 lists it as open). If you need a
treemap, note that `rollup-plugin-visualizer` is a new dev dependency and leave the decision
to the owner; do not add it silently.

## 2. Preload and lazy-route checks

- `app/preloadRoutes.ts` preloads Lobby and Game runtimes plus the socket client; a new route
  chunk must be reached only through `lazyRoute.ts`.
- Count direct `framer-motion` imports outside `features/motion` (36 files on 2026-10-06; the
  number may only fall): `grep -rln "from \"framer-motion\"" apps/web/src | grep -v features/motion`.
- `packages/shared` must not pull `zod` into the browser; check with the `vendor-zod` row.

## 3. Runtime — render cost

Protocol from plan 11 §1 (do the same steps before and after):

1. `npm run dev`, open the game page on a mobile viewport (Chrome DevTools, mid-range Android
   emulation, CPU 4× slowdown).
2. React DevTools Profiler: record one full turn (place → reveal → next card) and one
   timeline scroll. Note commits per second and the three most expensive components.
3. Performance panel: record the same; check long tasks > 50 ms, layout thrash
   (forced reflow warnings) and animated properties other than `transform`/`opacity`.
4. Known hot spots to watch: virtualised row springs (plan 11 Phase 1), `usePageLayoutMode`
   subscriptions per consumer (Phase 3), playback-progress re-renders (Phase 4), global
   capture-phase pointer listener (Phase 5), realtime render churn on every `state_update`
   (Phase 6).

Record numbers, not impressions. "Feels smoother" is not a result.

## 4. Battery and motion guardrails

- Always-on decorative animation during gameplay is forbidden (`CLAUDE.md` → Animation);
  check `HomePage/mobile/AnimatedMenuBackground.tsx` stays home-only.
- `prefers-reduced-motion` path must still render all states; test once with the OS setting.

## 5. Report

Before/after table (chunk, raw, gzip), eager-path totals, profiler commit counts, and which
plan acceptance checkbox the numbers prove. Then `/plan-status`. No commit.
