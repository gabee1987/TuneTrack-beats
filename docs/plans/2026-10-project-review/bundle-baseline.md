# Bundle baseline

Measured with `npm run build -w @tunetrack/web && npm run measure:bundle -w @tunetrack/web`
(`apps/web/scripts/measure-bundle.mjs`, gzip level 9). Budgets and gates:
`05-performance-and-robustness-plan.md` §2.1. Every package with a bundle budget appends one
row; rows are never edited.

| Date       | After package     | Eager gzip (kB) | Eager raw (kB) | Entry raw (kB) | `vendor-motion` eager | `vendor-zod` | Largest CSS raw (kB) |
| ---------- | ----------------- | --------------- | -------------- | -------------- | --------------------- | ------------ | -------------------- |
| 2026-10-07 | review baseline   | 147.0           | 464.0          | 119.4          | yes                   | yes          | 68.8                 |
| 2026-10-07 | D0 (A1–A8, B1–B2) | 147.5           | 465.7          | 121.1          | yes                   | yes          | 68.8                 |
