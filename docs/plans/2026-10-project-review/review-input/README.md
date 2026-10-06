# Review input (raw audit reports)

> **Temporary.** These five reports are the raw material behind
> [`../01-review-findings.md`](../01-review-findings.md). They are kept so that Phases 2–6 can be
> authored with full evidence after the review session is compacted. **Implementation agents must
> not read them**; the findings register and the phase documents are the normative source.
> Delete this folder when Phase 6 is written.

Reviewed 2026-10-06 at `629dc8a`. Line numbers are as of that commit. Placeholder data only.

| File                 | Scope                                                                                | Used by phase |
| -------------------- | ------------------------------------------------------------------------------------ | ------------- |
| `review-backend.md`  | `apps/server`, `packages/shared`, `packages/game-engine`; plan 04/05 status          | 5, 6          |
| `review-frontend.md` | `apps/web` rendering, startup, motion, architecture, mobile; plan 02/03/06/07 status | 5, 6          |
| `review-ux.md`       | Host and guest flow reconstruction, UX critique, target-flow options                 | 4             |
| `review-docs.md`     | Per-document verdicts, contradictions, target doc structure, skill candidates        | 2, 3          |
| `review-tests.md`    | Test inventory, gaps, quality, E2E harness, workflow, recommendations                | 3, 6          |
