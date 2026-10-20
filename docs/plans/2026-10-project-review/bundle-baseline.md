# Bundle baseline

Measured with `npm run build -w @tunetrack/web && npm run measure:bundle -w @tunetrack/web`
(`apps/web/scripts/measure-bundle.mjs`, gzip level 9). Budgets and gates:
`05-performance-and-robustness-plan.md` §2.1. Every package with a bundle budget appends one
row; rows are never edited.

| Date       | After package     | Eager gzip (kB) | Eager raw (kB) | Entry raw (kB) | `vendor-motion` eager | `vendor-zod` | Largest CSS raw (kB) |
| ---------- | ----------------- | --------------- | -------------- | -------------- | --------------------- | ------------ | -------------------- |
| 2026-10-07 | review baseline   | 147.0           | 464.0          | 119.4          | yes                   | yes          | 68.8                 |
| 2026-10-07 | D0 (A1–A8, B1–B2) | 147.5           | 465.7          | 121.1          | yes                   | yes          | 68.8                 |
| 2026-10-07 | C3–C6             | 148.1           | 467.3          | 122.8          | yes                   | yes          | 68.8                 |
| 2026-10-07 | D1                | 114.9           | 365.1          | 142.6          | no                    | yes          | 68.8                 |
| 2026-10-07 | D2                | 114.9           | 365.0          | 142.5          | no                    | no           | 68.8                 |
| 2026-10-07 | D3                | 90.8            | 273.6          | 51.1           | no                    | no           | 68.8                 |
| 2026-10-07 | D4, D5 (C7, E1)   | 90.9            | 273.5          | 51.1           | no                    | no           | 40.3                 |

From D1 the `vendor-motion` column means the framer animation runtime (`domAnimationFeatures`
chunk, 19.5 kB gzip, fetched after first paint); the `m`/LazyMotion core sits in the entry.
From D3 the active catalogue (`en` 11.6 kB, `hu` 13.1 kB gzip) loads before the app mounts and
is not in the eager column.

From D4 the largest stylesheet is `TimelinePanel-*.css` (timeline and action panels); the
Lobby stylesheet is 34.0 kB and the playlist editor's styles load with its lazy chunk. The
+0.1 kB on the eager path is the separate `vendor-zustand` chunk (D5).
