---
name: perf-check
description: Measure TuneTrack web bundle size and runtime render cost before and after a change using the repository's protocol (vite build output per chunk, gzip, eager path, React Profiler, chunk preloads). Use when a change touches apps/web/vite.config.ts, lazy routes, features/motion, i18n loading, timeline/drag rendering, or when a plan phase has a numeric acceptance criterion.
---

# perf-check

Binding budgets: `docs/plans/2026-10-project-review/05-performance-and-robustness-plan.md` §2.
Step detail: `10-bundle-and-startup.md` and `11-runtime-and-motion-performance.md`.

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
imports statically. Baseline 2026-10-07: 464.0 kB raw / 147.0 kB gzip. Gates (`05` §2.1):
eager path ≤ 110 kB gzip, entry ≤ 100 kB raw, no `vendor-motion` on the eager path, no
`vendor-zod`, largest CSS chunk ≤ 20 kB raw. Report a before/after table; a regression over
2 kB gzip on the eager path needs a justification in the report.

Once `05` WP D0 has landed, `npm run measure:bundle -w @tunetrack/web` computes these numbers
from `dist/` with Node built-ins only; append its row to `bundle-baseline.md`. No visualizer
dependency is planned; do not add one silently.

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
