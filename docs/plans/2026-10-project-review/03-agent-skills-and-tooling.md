# 03 — Agent Skills and Tooling (Phase 3 deliverable)

> **Status (2026-10-06):** Skills and the project permission file are written and live under
> `.claude/`. The boundary-lint ruleset (§4) and the root `verify` script (§5) are specified
> here for an implementation agent and are **not** implemented. Addresses findings **D-06**
> (resolved by this document), **T-01** and **T-02** (specified; code lands in Phase 6).
> Owner decisions that shaped it: one live plan (1), 48 px touch target (2), 700-line limit (3),
> `AGENT.md` merged into `CLAUDE.md` (4).

## 1. Why skills

The review found the same procedures repeated, slightly differently, across plan documents:
the green gate and its build-before-run trap, the eight-file checklist for a socket action,
the hint catalogue rules, the plan-status and archive conventions, the token-migration
treatment table, the bundle measurement protocol and the manual device checklist. Every
agent that needed one of them had to re-read a 300-line plan or re-derive it from code. A
skill is a short, named procedure the agent loads only when the task matches its trigger, so
it costs tokens once per use instead of once per session, and every agent follows the same
steps.

Design constraints applied to all eleven skills:

- **≤ 90 lines each**, one topic, no prose that `CLAUDE.md` or `docs/rules/*.md` already
  states. The skill cites the normative source and adds only the _how_.
- **Only file names that exist** on 2026-10-06 (checked against the tree). A skill that
  describes planned code says "planned" or points at the plan.
- **A trigger description an agent would match** in the `description:` front-matter, written
  as a sentence that names the task words a user types ("verify", "run the tests", "add a
  hint", "what should I test on the phone").
- **Placeholder data only** in every example (`TEST_ROOM_1`, `Player One`, `player-host`).
- **No git actions**; each skill ends by reporting changed files for the owner to review.

## 2. Skill catalogue (`.claude/skills/<name>/SKILL.md`)

| Skill                    | Trigger                                                                  | Encodes                                                                                                                                                                                    | Normative source                                                                     |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `verify`                 | before reporting any change done; "verify", "run the tests"              | scope table (workspace / packages / flows / docs), build-before-run trap, per-workspace and single-file commands, E2E harness facts, honest reporting                                      | `CLAUDE.md` → Testing, Working Agreement                                             |
| `add-socket-action`      | new or changed room action, new payload field                            | shared event + schema + types, façade and service placement, `createSocketHandler` with `idempotency`, `errorMessages`, `emitAction` hook, `localizedErrors`, en/hu keys, four-layer tests | backend rules §1–§4, §6–§7; frontend rules §4, §8                                    |
| `add-ui-component`       | any new component, section, dialog, sheet, variant                       | placement table, primitive reuse rule, narrow props, token-only CSS, 48 px targets, motion helpers, same-path history entry for overlays, component test, `/dev/ui`                        | `CLAUDE.md` → Look & Feel; frontend rules §1–§3, §5–§8; design system §2, §4, §6, §8 |
| `add-hint`               | a screen needs a one-time explanation; hint text changes                 | "should this be a hint" gate, `HintId` + `hintRegistry` + en/hu keys, anchor pattern, priority table of the 11 existing hints, test options                                                | plan 18 §2                                                                           |
| `write-tests`            | adding tests, failing-test-first bug fixes, flaky tests                  | layer → location → pattern-file table, the web harness API, server construction pattern, test-quality rules, run commands                                                                  | `CLAUDE.md` → Testing; backend rules §15; frontend rules §12; plan 19 §9             |
| `e2e-scenario`           | user-visible flow changed; defect needs an E2E regression                | Playwright harness facts, the seven helpers in `room-entry.spec.ts`, two-context pattern, offline simulation, new-file placement (spec split)                                              | plan 19 §3, §9                                                                       |
| `plan-status`            | after a task from the live plan lands                                    | per-case edit list (phase shipped, finding resolved, defect resolved, rule changed, programme phase), style rules, what never to touch                                                     | `00-index.md` §8                                                                     |
| `archive-doc`            | a document fully shipped or superseded                                   | dead-document check, `git mv` to `docs/archive/`, the two header templates, inbound-link grep, where to record                                                                             | `docs/README.md` Archive paragraph                                                   |
| `design-token-migration` | file in `PENDING_MIGRATION`, literal flagged, plan 15 §4 / plan 14 §2    | one-file queue, literal grep, three colour categories + spacing + z-index treatment table, token definition files, parity rule, allowlist shrink                                           | design system §2–§4, §6; plan 15 §4; plan 14 §2                                      |
| `perf-check`             | change touches `vite.config.ts`, lazy routes, motion, i18n loading, drag | chunk table to record, eager-path definition and working targets, preload/lazy checks, runtime profiler protocol, battery guardrails, report shape                                         | plan 10 §1–§2; plan 11 §1                                                            |
| `device-checklist`       | drag, overlay, navigation, playback, reconnect, hint, rotation changes   | M1–M18 with an Area column for scoping, device matrix, result table format, how a ✗ becomes a defect                                                                                       | plan 19 §8                                                                           |

`device-checklist` is the eleventh skill: plan 19 §8 said Phase 3 would turn the manual
checklist into one so it is actually run.

### Cross-references between skills

`add-socket-action`, `add-ui-component`, `add-hint`, `design-token-migration` and
`e2e-scenario` end with `/verify` and `/plan-status`; `perf-check` and `device-checklist`
feed `/plan-status`; `archive-doc` calls `/plan-status` for the §8 row. No skill duplicates
another's steps.

## 3. Project permission file (`.claude/settings.json`)

Committed, shared by every agent on the repository; `settings.local.json` stays personal and
uncommitted. The allow list is **read-only and verification-only**: typecheck, lint, unit and
E2E tests, `npx vitest run`, `npx tsc --noEmit`, `npx prettier --check`, the three workspace
builds the build-before-run trap needs (`shared`, `game-engine`, `web`; they write only to
git-ignored `dist/`), and read-only git commands (`status`, `diff`, `log`, `show`, `blame`,
`branch`).

The deny list enforces the Working Agreement and the organisation rules without relying on
memory: every history-changing or state-changing git command (`commit`, `push`, `rebase`,
`reset`, `checkout`, `switch`, `restore`, `stash`, `clean`, `merge`, `cherry-pick`, `tag`),
`npm publish` / `npm version`, reading any `.env` file (secrets; `.env.example` is not
matched) and reading `docs/archive/**` (`CLAUDE.md` says never to).

Anything else (editing files, `npm install`, `npm run dev`, `git mv`) keeps the default
"ask" behaviour. Rationale: the file must never be the reason an agent silently installs a
dependency or starts a long-running server.

## 4. Specification — architecture-boundary lint (T-02, implement in Phase 6)

Target: `eslint.config.js` (flat config, `typescript-eslint` already present). Two plugins
are required and are new dev dependencies; flag them to the owner before installing:
`eslint-plugin-react-hooks` (rules-of-hooks + exhaustive-deps for `apps/web`) and
`eslint-plugin-boundaries` (or `no-restricted-imports` patterns if the owner prefers zero new
plugins; the rules below are expressed so either works).

Element types (by path) and the imports each may use:

| Element                            | May import                                                       | Must not import                                                                              |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/game-engine/src/**`      | itself                                                           | `socket.io*`, `express`, `pino`, `zod`, `node:*`, `@tunetrack/shared` runtime, `process.env` |
| `packages/shared/src/**`           | `zod`, itself                                                    | anything from `apps/*`, `game-engine`                                                        |
| `apps/server/src/realtime/**`      | `rooms/`, `app/`, shared                                         | `spotify/` internals except through `RoomService`                                            |
| `apps/server/src/rooms/**`         | `game-engine`, shared, `decks/`, `spotify/` stores, `app/logger` | `socket.io` types other than for broadcasting callbacks, `express`                           |
| `apps/web/src/features/**`         | other `features/*`, `services/*`, `hooks/*`, shared **types**    | `pages/**`                                                                                   |
| `apps/web/src/pages/<A>/**`        | own page, `features/*`, `services/*`, `hooks/*`, shared types    | `pages/<B>/**`, `framer-motion` from `hooks/` (controllers)                                  |
| `apps/web/src/pages/**/mobile/**`  | own page except `desktop/`                                       | `desktop/**` (and vice versa)                                                                |
| `apps/web/src/services/**`         | shared types, browser APIs, `socket.io-client`                   | `react`, `*.module.css`, `pages/**`, `features/**`                                           |
| `apps/web/src/**` (all)            | —                                                                | `zod` (runtime; types via `import type` only), `@tunetrack/shared/dist`                      |
| `apps/web/src/**/*.tsx` components | —                                                                | `services/socket/socketClient` directly (use `emitAction` / page hook)                       |

Additional rules: `no-restricted-syntax` for `navigator.vibrate` outside
`services/haptics/`, `window.localStorage` outside `features/preferences`,
`features/profile`, `features/hints/hintState.ts`, `services/session`,
`services/savedPlaylists` and `app/lazyRoute.ts`; `no-restricted-imports` of
`framer-motion` outside `features/motion/**` and files whose name ends in
`Transition.tsx`, `Celebration.tsx`, `Portal.tsx` or `Presence.tsx` (then shrink the list as
plan 10 Phase 1 lands; today 36 files import it directly, so this rule starts as `warn` with
an allowlist that may only shrink, like the CSS guards).

Acceptance: `npm run lint` fails on a fixture import from `packages/game-engine` to
`socket.io`, from `pages/GamePage` to `pages/LobbyPage`, and from any `apps/web` file to `zod`
at runtime; the existing tree lints clean after the allowlists are seeded.

## 5. Specification — root `verify` script (T-01, implement in Phase 6)

Add to the root `package.json`:

```json
"verify": "npm run typecheck && npm run lint && npm test",
"verify:full": "npm run verify && npm run e2e",
"format:check": "prettier --check ."
```

Rules: the script runs the workspaces in dependency order (npm does this through
`--workspaces`), never swallows a failure, and prints nothing beyond the tools' own output.
`verify:full` is the gate for realtime, navigation and overlay changes (`CLAUDE.md` → Testing).
Coverage (`@vitest/coverage-v8`) is a Phase 6 decision for the owner; do not add it here. CI
(GitHub Actions running `verify:full` on pull requests, Chromium only) is specified in
plan 19 §7 and stays in Phase 6.

## 6. What this phase deliberately left out

- No `.claude/agents/` definitions and no hooks. The skills are enough until a repeated
  multi-step workflow justifies an agent; hooks that run tests on every edit would cost more
  than they save at this test-suite size.
- No skill for the host creation flow: Phase 4 specifies it first.
- No MCP servers or external tooling. Any such addition is a third-party processor and
  needs compliance review before use.

## 7. Acceptance

- [x] Eleven skills exist, each under 90 lines, each with a trigger description.
- [x] Every file path named in a skill exists, or is explicitly marked planned.
- [x] `.claude/settings.json` committed with read-only allow rules and a deny list.
- [x] Boundary-lint ruleset and root `verify` script specified for Phase 6.
- [x] `CLAUDE.md` → Workflow points to the skills; `docs/README.md` lists this document;
      `00-index.md` §4 row for Phase 3 is done; D-06 marked resolved; plan 19 §8 points to
      `device-checklist`.
