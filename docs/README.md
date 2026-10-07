# TuneTrack Beats — Documentation Index

Read this file first. Reset 2026-10-06 (Phase 2 of the review programme).

## If you are an AI agent starting a session

1. [`../CLAUDE.md`](../CLAUDE.md) is auto-loaded and **normative**: product rules, game rules,
   architecture, coding principles, working agreement.
2. Read [`plans/2026-10-project-review/00-index.md`](plans/2026-10-project-review/00-index.md),
   the **only live plan**. §4 says which document owns your task; §5 holds the binding owner
   decisions; §8 lists the work-breakdown documents and their status.
3. Read the one document that owns your task: `01-review-findings.md` for the finding,
   `10`–`19` for the work breakdown, `20-bug-register.md` for a defect.
4. Read the `rules/` file for the layer you change. Open `decision_log.md` only when a rule's
   _why_ matters. Recurring procedures (verification, adding a socket action, a component, a
   hint, tests, plan bookkeeping) are skills under `.claude/skills/`; `CLAUDE.md` → Workflow
   lists them.

**Do not read `archive/`.** Everything in it has shipped or was superseded, and every file says
so in its header. `operations/` is for deploying and log collection, not for coding tasks.

## Normative rules

| File                                                                         | Scope                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`../CLAUDE.md`](../CLAUDE.md)                                               | Vision, game rules, connection lifecycle, layer ownership, core rules, coding principles, working agreement, workflow.  |
| [`rules/backend_engineering_rules.md`](rules/backend_engineering_rules.md)   | `apps/server`: handler shape, acks and idempotency, mutation, errors, mapping, timers, Spotify module, security, audit. |
| [`rules/frontend_engineering_rules.md`](rules/frontend_engineering_rules.md) | `apps/web`: layer responsibilities, page shape, controller flow, realtime client, overlays and history, motion, CSS.    |
| [`rules/design_system.md`](rules/design_system.md)                           | Tokens, scales, layering, shared primitives, accessibility, performance guardrails.                                     |

Where two rules disagree, prefer the stricter one and raise the conflict.

## Live plan

[`plans/2026-10-project-review/`](plans/2026-10-project-review/00-index.md) — the full project
review of 2026-10-06 and its phased roadmap.

| Document                                | Contents                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `00-index.md`                           | Purpose, reading order, verified baseline, phases, hotfix track, owner decisions, folded-doc status.                 |
| `01-review-findings.md`                 | Findings register (`B-` backend, `F-` frontend, `U-` UX, `D-` docs, `T-` tests) with priorities.                     |
| `03-agent-skills-and-tooling.md`        | Phase 3: the skill catalogue under `.claude/skills/`, the project permission file, boundary-lint and `verify` specs. |
| `04-host-flow-ux-spec.md`               | Phase 4: host creation flow, screen by screen, deck gating, hints, acceptance and work packages.                     |
| `05-performance-and-robustness-plan.md` | Phase 5: binding performance budgets, measurement commands, robustness work packages and rollout order.              |
| `06-structure-and-test-plan.md`         | Phase 6: file-size, boundary and test gates, structure and test work items, CI and coverage, rollout order.          |
| `10`–`19`                               | Work-breakdown documents folded from the 2026-09 programme, trimmed to open work.                                    |
| `20-bug-register.md`                    | Active defects with next proof, plus the resolved ledger and tech-debt notes.                                        |

## Operations (not on the coding path)

| File                                                                             | Scope                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`operations/deploy-railway-frontend.md`](operations/deploy-railway-frontend.md) | The current deployment path: Railway (Socket.IO backend) + Render Static Site (frontend).   |
| [`operations/deploy-self-hosted.md`](operations/deploy-self-hosted.md)           | Self-hosting from home, including the HTTPS and Spotify-callback problem for LAN play.      |
| [`operations/axiom_logging_setup.md`](operations/axiom_logging_setup.md)         | Collecting realtime audit logs during test sessions; third-party processor, see its header. |

## Decision log

[`decision_log.md`](decision_log.md) — dated implementation decisions and open questions. Append
to it when a product rule changes; game rules themselves live in `CLAUDE.md`.

## Archive

[`archive/`](archive/) holds completed or superseded plans and the original 2026-09 programme
folder, each with a header stating what shipped, what did not and what superseded it. Kept for
history only; do not read it for current work.
