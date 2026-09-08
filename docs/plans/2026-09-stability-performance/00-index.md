# TuneTrack Beats — Stability, Performance & UX Hardening Programme

> **Created:** 2026-09-08
> **Status:** Planning complete. No implementation performed.
> **Authority:** This programme is subordinate to [`CLAUDE.md`](../../../CLAUDE.md) and
> [`AGENT.md`](../../../AGENT.md). Where this programme and those documents disagree,
> the stricter rule applies and the conflict must be raised before implementation.

## 1. Purpose

This folder contains the detailed remediation plan produced from a full audit of the
TuneTrack Beats codebase (`apps/server`, `apps/web`, `packages/shared`,
`packages/game-engine`) carried out on 2026-09-08 against commit `37ccf20`.

The programme addresses five objectives stated by the product owner:

1. **Stability** — eliminate network, session and reconnect inconsistencies on both tiers.
2. **Performance** — reduce startup cost, bundle size and runtime work, especially on mobile.
3. **Correctness** — fix the enumerated defect list with verified root causes.
4. **User experience** — consistent navigation, a single design system, first-run guidance,
   persistent player identity and a persistent Spotify session.
5. **Confidence** — a materially stronger automated test suite (unit, integration, component, E2E).

## 2. Measured baseline (2026-09-08)

Recorded so every later claim of improvement is falsifiable.

| Metric | Value |
| --- | --- |
| Workspace typecheck | passes |
| Workspace tests | 240 passing (server 108 / 17 files, web 101 / 28 files, engine 31 / 2 files) |
| Web component tests | **0** (no `jsdom` environment configured) |
| Web E2E tests | **0** |
| Coverage thresholds | none configured in any workspace |
| Initial JS + CSS critical path (home screen) | **454 kB raw / approx. 145 kB gzip** before the route chunk loads |
| Largest single chunk | `vendor-react-dom` 130.18 kB (41.84 kB gzip) |
| Largest avoidable chunk | `vendor-motion` 116.84 kB (39.01 kB gzip), eagerly loaded |
| Fully unused shipped chunk | `vendor-zod` 54.88 kB (12.61 kB gzip) |
| Largest feature chunk | `LobbyRoomActions` 79.84 kB JS + 68.96 kB CSS |
| Hardcoded hex colours in CSS modules | 94 |
| Page components importing the primitives layer | 9 of 69 |

Reproduce with:

    npm run typecheck
    npm test
    npm run build        # per-chunk sizes are printed by Vite

## 3. Reading order

| # | Document | Scope |
| --- | --- | --- |
| 01 | [`01-audit-findings.md`](./01-audit-findings.md) | Full findings register with evidence and severity. Read first. |
| 02 | [`02-bundle-and-startup.md`](./02-bundle-and-startup.md) | Bundle size, code splitting, what loads when. |
| 03 | [`03-runtime-and-motion-performance.md`](./03-runtime-and-motion-performance.md) | Render cost, animation cost, battery. |
| 04 | [`04-backend-stability-and-sessions.md`](./04-backend-stability-and-sessions.md) | Server lifecycle, room/session ownership, leaks, timers. |
| 05 | [`05-network-protocol-and-resilience.md`](./05-network-protocol-and-resilience.md) | Transport contract, acknowledgements, reconnect, idempotency. |
| 06 | [`06-navigation-and-overlays.md`](./06-navigation-and-overlays.md) | Back-button behaviour, overlay layering, z-index scale. |
| 07 | [`07-design-system-consolidation.md`](./07-design-system-consolidation.md) | Single component system, tokens, skeletons, loading states. |
| 08 | [`08-spotify-session-and-playback.md`](./08-spotify-session-and-playback.md) | Persistent Spotify login, deterministic playback, transport controls. |
| 09 | [`09-room-and-player-identity-flow.md`](./09-room-and-player-identity-flow.md) | Room creation flow rework, player profile separation, in-game metadata override. |
| 10 | [`10-onboarding-hint-system.md`](./10-onboarding-hint-system.md) | First-run interactive hints and tutorials. |
| 11 | [`11-testing-strategy.md`](./11-testing-strategy.md) | Test pyramid, tooling, coverage gates, CI. |
| 12 | [`12-bug-register.md`](./12-bug-register.md) | Each reported defect: root cause, fix, verification. |
| 13 | [`13-docs-cleanup.md`](./13-docs-cleanup.md) | Which existing documents to keep, archive or delete. |

## 4. Recommended execution sequence

The sequence is chosen so that safety nets precede risky work, and so that shared
foundations land before the features that depend on them.

| Wave | Work | Rationale |
| --- | --- | --- |
| **W0 — Safety nets** | Doc 11 sections 3 (jsdom + RTL wiring), 5 (Playwright harness), 7 (coverage gates). Re-verify Doc 01 evidence as failing tests. | Nothing else is safe to change without regression cover. |
| **W1 — Cheap, isolated defect fixes** | Doc 12 items B1, B2, B4, B8, B11 | High user-visible value, low blast radius, provable with the W0 harness. |
| **W2 — Shared foundations** | Doc 06 (overlay + navigation layer), Doc 07 phases 1-2 (z-index scale, single button/icon-button system) | Later UX work depends on these primitives. |
| **W3 — Startup performance** | Doc 02 phases 1-4 | Independent of behaviour; measurable per phase. |
| **W4 — Stability** | Doc 04, then Doc 05 | Server ownership must be correct before the client protocol is tightened. |
| **W5 — Runtime performance** | Doc 03 | Benefits from W2's consolidated components. |
| **W6 — Feature UX** | Doc 09, Doc 08, Doc 07 phases 3-4 (skeletons), Doc 10 | Depends on all of the above. |
| **W7 — Cleanup** | Doc 13, plus removal of the dead code listed in Doc 01 section 7 | Last, so nothing in flight is disturbed. |

Each wave must end green on `npm run typecheck && npm run lint && npm test`, plus the
E2E smoke suite once W0 is in place.

## 5. Programme-level exit criteria

- [ ] Initial critical path at or below **200 kB gzip** total for the home screen, and
      framer-motion no longer on the eager path.
- [ ] `vendor-zod` absent from the web bundle.
- [ ] No raw `z-index` literals in CSS modules; every layer resolves to a `--z-*` token.
- [ ] Exactly one button component, one icon-button component and one dialog/sheet
      component in use across all pages.
- [ ] Browser and Android hardware back close the topmost overlay, never navigate past it.
- [ ] A host reconnect after a network drop rejoins the same room and identity with no
      user-visible error, verified by an automated integration test.
- [ ] An in-game disconnect that never returns is cleaned up by a server timer, and an
      emptied room is removed, verified by an automated integration test.
- [ ] Spotify Premium authorisation survives an app restart and a new room, subject to
      the security and data-protection controls in Doc 08 section 6.
- [ ] Playback can be started, paused, resumed and restarted at any point in a turn,
      including after the track has ended.
- [ ] Player display name is set outside the room flow and persists across app restarts.
- [ ] First-run hints appear once, are dismissible, and are resettable from settings.
- [ ] Every page presents a structure-matching skeleton while loading.
- [ ] Test suite: component tests for all shared primitives and every overlay; integration
      tests for connect/disconnect/reconnect/host-transfer/close-room; E2E for
      create, join, place, challenge, reveal, win.

## 6. Compliance and security notes

These apply across the programme and are expanded in the relevant documents.

- **Spotify remains a third-party processor.** Any change that broadens what is stored
  about a user's Spotify account — in particular persisting refresh tokens beyond a
  single room lifetime (Doc 08) — requires compliance review before it reaches a
  production or client-facing deployment. Treat it as new processing, not a refactor.
- **Refresh tokens are credentials and personal data.** Doc 08 section 6 specifies
  encryption at rest, bounded retention, revocation and a documented lawful basis,
  aligned with GDPR Art. 5(1)(c) (data minimisation), Art. 32 (security of processing)
  and ISO/IEC 27001 Annex A.8 controls.
- **Data minimisation applies to the realtime protocol.** Doc 05 reduces what is
  broadcast to all room members; no player should receive data they do not need.
- **New third-party services need review.** No plan in this programme introduces a new
  hosted service. Development-only tooling (Playwright, a bundle visualiser) stays out
  of the runtime dependency graph; if any is proposed for CI on managed infrastructure,
  raise it for review first.
- **Test fixtures use placeholder data only** — for example `roomId: "TEST_ROOM_1"`,
  `playerId: 12345`, `displayName: "Player One"`. No real account identifiers,
  playlist URLs or personal names in fixtures, snapshots or documentation.

## 7. What this programme deliberately does not do

- No change to the game rules in `packages/game-engine`, except the additive in-game
  metadata correction path specified in Doc 09 section 5.
- No persistence layer for room state (Redis/PostgreSQL remains future work); Doc 04
  fixes in-memory ownership only.
- No desktop visual redesign; desktop must not regress.
- No new gameplay features beyond those the product owner explicitly requested.
