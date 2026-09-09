# TuneTrack Beats — Documentation Index

Reorganised 2026-09-08. Read this file first.

## If you are an AI agent starting a session

1. Read [`../CLAUDE.md`](../CLAUDE.md) — **normative** product, architecture and coding rules.
2. Read [`../AGENT.md`](../AGENT.md) — general agent behaviour rules.
3. Read [`plans/2026-09-stability-performance/00-index.md`](plans/2026-09-stability-performance/00-index.md)
   — the **only live plan**. Start there for what to work on.
4. Consult `rules/` for the layer you are changing.

**Do not read `archive/`.** Everything in it is either already shipped or explicitly
superseded, and every file carries a header saying so. Reading it wastes context and risks
implementing something twice or reverting a deliberate change.

## Normative rules

| File | Scope |
| --- | --- |
| [`../CLAUDE.md`](../CLAUDE.md) | Product, game rules, architecture principles, layer ownership, coding principles. Wins over everything in this folder. |
| [`rules/backend_engineering_rules.md`](rules/backend_engineering_rules.md) | `apps/server`, backend contracts and orchestration. |
| [`rules/frontend_engineering_rules.md`](rules/frontend_engineering_rules.md) | `apps/web`, layering, file structure, CSS rules. |
| [`rules/design_system.md`](rules/design_system.md) | Tokens, scales, layering, shared components, accessibility, performance guardrails. |

Where two rules disagree, prefer the stricter one and raise the conflict.

## Architecture

| File | Scope |
| --- | --- |
| [`architecture/tunetrack_full_architecture.md`](architecture/tunetrack_full_architecture.md) | The product vision and system design. Fixed base rules. |
| [`architecture/tunetrack_technical_implementation_plan.md`](architecture/tunetrack_technical_implementation_plan.md) | Longer-form engineering rationale and the extension roadmap. `CLAUDE.md` is normative where they overlap. |

## Live plans

| File | Scope |
| --- | --- |
| [`plans/2026-09-stability-performance/`](plans/2026-09-stability-performance/) | **The current programme.** Stability, performance, UX and testing. 14 documents; start at `00-index.md`. |
| [`plans/gamepage-remaining-refactors.md`](plans/gamepage-remaining-refactors.md) | Low-priority GamePage cleanup carried over from a completed refactor. Four open items, three of them owned by the programme above. |

## Operations

| File | Scope |
| --- | --- |
| [`operations/deploy-railway-frontend.md`](operations/deploy-railway-frontend.md) | **The current deployment path:** Railway (Socket.IO backend) + Render Static Site (frontend). |
| [`operations/deploy-self-hosted.md`](operations/deploy-self-hosted.md) | Self-hosting from home, including the HTTPS and Spotify-callback problem for LAN play. |
| [`operations/axiom_logging_setup.md`](operations/axiom_logging_setup.md) | Collecting realtime audit logs during test sessions. |

## Decision log

[`decision_log.md`](decision_log.md) — concrete implementation decisions and open
questions, so they do not stay hidden in code. Append to it; do not rewrite it.

## Archive

[`archive/`](archive/) holds 15 completed or superseded plans, unedited apart from a header
stating what shipped, what did not, and what superseded them. Kept because they explain
*why* the code is shaped as it is.

Two of the archived headers matter even if you never open the file:

- `reconnect_and_host_transfer_plan.md` was only **partially** implemented. Its in-game
  eviction timer was never wired up, which is why an abandoned in-game player is never
  removed and the room never gets deleted. That is finding F-12, now owned by the live
  programme.
- `playlist_metadata_curation_plan.md` shipped phases 1-3 only. Its phase 4 (in-game host
  correction of a wrong release year) is unimplemented and is now owned by the live
  programme.

Deleted in the same pass: `deploy-render.md` (documented a deployment path the project
moved away from) and `frontend_rework_sequence_plan.md` (sequencing for a finished phase).
Both remain in git history.
