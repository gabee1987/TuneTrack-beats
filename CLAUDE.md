# TuneTrack-beats — CLAUDE.md

Normative rules for every agent and contributor working in this repository. Everything else
is indexed by [`docs/README.md`](docs/README.md); the one live plan is
[`docs/plans/2026-10-project-review/00-index.md`](docs/plans/2026-10-project-review/00-index.md).
**Do not read `docs/archive/`** — everything in it has shipped or been superseded.

---

## Vision

TuneTrack is a **mobile-first, real-time multiplayer party game** where players place songs
into a chronological timeline. It must feel better than a physical card game, require zero
install, and scale from a local party to online play. Design goals: frictionless social
experience, fast turns, hidden information until reveal, tactile touch interaction, and
motion that explains what just happened.

---

## Game Rules

- A host creates a room; players join in the browser. The host also plays and takes turns.
- The host device plays the audio. The active player places the song where its release year
  fits on their own timeline.
- **Correct placement** → the card stays. **Wrong** → the card is discarded.
- First player to collect **N cards** wins (configurable, default 10, range 3–30).
- Each player starts with 1 revealed card; the host can override this per player in the lobby.
- **Same-year rule:** every slot inside a same-year block is a valid placement.
- **TT tokens** buy special actions on the player's own turn: skip the current card (1 TT,
  once per turn), buy the current card (3 TT, placed automatically, no challenge window) and
  challenge ("Beat!"). The host awards TT manually.
- **Challenge:** any player with at least one TT may challenge a placement before reveal.
  Success steals the card onto the challenger's timeline; failure costs 1 TT (never below 0).
  Only the initial claim is timed; without a claim the server auto-resolves the placement.
- Reveal confirmation mode is `host_only` (default) or `host_or_active_player`.
- **The host may skip the active turn for any player at any time.** A 60 s safety auto-skip
  (`TURN_SKIP_GRACE_MS`) remains as a fallback when the active player is offline.
- **Deck exhaustion** (decided 2026-10-06; engine shipped 2026-10-07, lobby indicator
  pending): when the deck is empty, every card that left play without reaching a timeline
  (wrong placements, failed challenges, TT skips, skipped or cancelled turns) is reshuffled
  into a new deck; cards on timelines stay out. A TT skip never hands back the skipped card. The lobby shows how many cards the deck needs for the
  current player count and win target, and warns when the deck is smaller. If the deck and
  the discard pile are both empty, the game finishes: most timeline cards wins, and on a tie
  the player who reached that count first (decided 2026-10-07).
- **No silent practice deck** (decided 2026-10-06, implementation pending): Start is blocked
  until a deck exists; the host chooses the practice deck explicitly.

### Connection lifecycle

- A **lobby** player who disconnects is removed after `RECONNECT_GRACE_MS` (default 30 s)
  unless they reconnect first.
- An **in-game** player who disconnects stays reserved — identity, timeline, tokens, turn —
  until they reconnect, the host removes them, or the room closes. Every client sees who is
  offline.
- A **host** disconnect starts a `HOST_TRANSFER_GRACE_MS` (default 30 s) grace. A reconnect
  cancels it; otherwise the first connected remaining player becomes host.
- A room in which **every** player stays offline for `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS`
  (default 1 h) is closed as a unit. A room is removed when its last player leaves or is
  kicked, or when the host closes it.
- All durations are validated environment settings (`apps/server/src/app/env.ts`).

### Track Metadata

Spotify is an **import source, not the game truth.** Remasters, deluxe editions,
compilations and re-releases report the year of whichever album contains the track; players
guess the _original_ release year.

- `releaseYear` is the authoritative gameplay answer. `sourceReleaseYear` preserves what
  Spotify reported.
- `metadataStatus` is `imported` | `edited` | `verified`. A host edit to title, artist, album
  or year promotes `imported` to `edited` unless the host sets the status explicitly.
- Release-year curation is the primary host workflow before a game; the playlist editor
  exists for it. Curated playlists are saved locally (`services/savedPlaylists`), never in
  room settings.
- No external metadata-enrichment API and no automatic canonical-year lookup.
- Imported-deck mutation belongs in `rooms/`, never in Socket.IO handlers.

---

## Look & Feel

The token and component contract is [`docs/rules/design_system.md`](docs/rules/design_system.md).
The rules below are the ones every change must satisfy.

- **Playful but purposeful.** Whimsy lives in motion and colour accents; the information
  hierarchy is always unambiguous.
- **Dark theme is the default and primary target.** Colours, surfaces, shadows and layers
  use design tokens (CSS custom properties), never literals. A new theme is a token set, not
  component edits.
- **Motion follows Material 3:** emphasised decelerate on enter, emphasised accelerate on
  exit, standard easing between states. 200–350 ms for most transitions, up to 500 ms only
  for large entries or celebration. Motion communicates state change; it never decorates. The one exception is the home
  screen's ambient background (`transform`/`opacity` only, paused when hidden or reduced).
  `prefers-reduced-motion` is honoured through the shared motion helpers only.
- **Mobile and desktop are separate UI assemblies** that share hooks, services and state.
  Mobile is the primary surface: thumb-reachable controls, **48 × 48 px minimum touch
  targets**, no hover-only affordances. Desktop may add richer layouts but never regresses
  mobile.

---

## Tech Stack

| Layer         | Technology                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| Frontend      | React 18, TypeScript, Vite, react-router-dom, Framer Motion, CSS Modules, PWA                 |
| Drag / lists  | @dnd-kit (drag mechanics), @tanstack/react-virtual                                            |
| Client state  | Zustand for durable UI preferences and the player profile only; hints use a storage module    |
| i18n          | `.properties` catalogues (`en`, `hu`) under `features/i18n`, key parity guarded by a test     |
| Backend       | Node.js, TypeScript, Express (HTTP + Spotify OAuth callback), Socket.IO, Pino                 |
| Validation    | Zod schemas shared through `packages/shared`, also for server `env`                           |
| Storage (MVP) | In-memory; Spotify tokens and playback sessions are keyed per room                            |
| Tests         | Vitest (jsdom + React Testing Library for the web), Playwright E2E with a fake Spotify server |

### Monorepo

```
apps/server            — Node.js + Express + Socket.IO backend
apps/web               — React + Vite frontend
apps/e2e               — Playwright scenarios (fake Spotify server on 3102, server 3101, preview 4173)
packages/game-engine   — pure gameplay rules, zero framework deps
packages/shared        — public contracts, event names, Zod schemas, constants
```

`packages/shared` and `packages/game-engine` resolve `types` to `src` but runtime `default` to
`dist`: after changing either package run `npm run build -w @tunetrack/shared` (and
`-w @tunetrack/game-engine`) before running the server or the E2E suite. `npm run dev` and
`npm run e2e` do this for you.

---

## Architecture Principles

### Core rules (non-negotiable)

- **Server is the single source of truth.** Never trust client-computed state or permissions.
- **Game rules live in `packages/game-engine`:** no Socket.IO, Express, timers, storage,
  environment access or logging inside the engine.
- **Transport concerns belong at the edges** (`realtime/`, `http/`).
- **Validation at boundaries:** every socket payload is parsed through a shared Zod schema
  before a service call; every mutating action is acknowledged and carries a `requestId` that
  the server treats idempotently.
- **Mapping is centralised and pure:** `mapGameStateToPublicRoomState` and friends never
  mutate or orchestrate. Hidden answers (`releaseYear` during `turn`/`challenge`) are never
  serialised to clients.
- **Orchestration is explicit:** state transitions go through named methods; no hidden
  mutation via helper side effects; membership and phase are validated before every mutation.
- **Timers are orchestration concerns:** one owner (`RoomTimerCoordinator`), explicit
  cleanup, state re-checked before mutating, callbacks that log and never throw.

### Backend layer ownership (`apps/server/src`)

| Layer                  | Owns                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `app/`                 | bootstrap, validated `env`, logger, audit logger and Axiom sink, HTTP and Socket.IO server creation |
| `http/`                | health routes, Spotify OAuth callback routes                                                        |
| `realtime/`            | socket event registration, payload parsing, acks, error mapping, broadcasts, room directory         |
| `rooms/`               | room lifecycle, membership and reconnect, orchestration, timers, public-state mapping               |
| `decks/`               | deck loading and validation, playlist import into track cards                                       |
| `spotify/`             | OAuth, per-room token and playback-session stores, Web API client, search and discovery, mapping    |
| `packages/game-engine` | rules, placement, challenge and reveal, turn progression                                            |
| `packages/shared`      | public contracts, payload schemas, ack contract, constants                                          |

### Frontend layer ownership (`apps/web/src`)

| Layer           | Owns                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`          | router, route order and transitions, lazy route loading, global styles                                                                                             |
| `pages/<Page>/` | screen assembly only: a `mobile/` and a `desktop/` assembly, page-local `hooks/` (controller, selectors, coordinators) and `components/`                           |
| `features/`     | cross-page capabilities: `app-shell`, `hints`, `i18n`, `loading`, `mobile-shell`, `motion`, `preferences`, `profile`, `rooms`, `theme`, `toast`, `ui` (primitives) |
| `hooks/`        | generic reusable hooks only (`useMediaQuery`, `usePageLayoutMode`); page-specific hooks live under that page                                                       |
| `services/`     | browser integrations: socket client and `emitAction`, session identity, saved playlists, haptics                                                                   |
| `test/`         | shared harness: `renderWithProviders`, `fakeSocket`, `fakeSpotifyPlayer`, room-state fixtures, guard tests                                                         |

### Modularity

- One module, one reason to change. Composition over multipurpose files. Extract after the
  second or third meaningful repetition, not the first coincidence.
- **File size: a source file above 700 lines must be split before the change is finished.**
  Soft guidance: component ~200 lines, controller hook ~300, service ~300, CSS module ~300,
  utility ~150. When a file grows past its soft limit, extract rather than accumulate.
- Do not add responsibilities to `RoomRegistry` or `RoomService`; extract narrower
  collaborators instead.

### Animation

- Framer Motion for meaningful state transitions (mount/unmount, gameplay feedback,
  overlays); CSS for static layout and simple hover/focus/disabled states.
- @dnd-kit owns drag mechanics; Framer Motion may decorate drag outcomes only.
- Backend-driven transitions use a dedicated coordinator hook with a named motion contract;
  raw prop changes never race local timers.
- Animate `transform` and `opacity`; never `width`, `height`, `margin` or `layout` on page
  containers on mobile.

---

## Coding Principles

- **Clean over clever.** Readability and maintainability first; performance and battery use on
  mid-range phones is a product requirement, not polish.
- **No comments on what code does.** Names explain that; comment only a non-obvious _why_.
- **No premature abstraction, no speculative features, no configurability nobody asked for.**
- **No error handling for impossible cases.** Trust internal guarantees; validate at boundaries.
- **Boolean names read like facts:** `isChallengeOwner`, `canConfirmBeatPlacement`.
- **No long nested ternaries;** use named helpers, early returns or `switch`.
- **Logging only for** startup, shutdown, socket connect/disconnect, unexpected errors and
  notable room lifecycle events. Never inside the game engine. Logs are not tests.
- **Placeholder data only** in fixtures, docs and examples (`TEST_ROOM_1`, `12345`,
  `Player One`, `YOUR-RAILWAY-DOMAIN`). No real names, hostnames or account identifiers.
- **Third-party services** (Spotify, Axiom, any new API) are processors that need compliance
  review before a client-facing deployment; flag them, do not add them silently.

---

## Working Agreement

- **Think before coding.** State assumptions that affect the solution. If several readings
  exist, name them instead of silently choosing. If something important is unclear, ask.
  Push back when a request would make the code slower, less safe or inconsistent with this file.
- **Surgical changes.** Touch only what the task requires. Do not reformat, rename or
  "improve" adjacent code. Remove what your own change made unused; mention, do not delete,
  unrelated dead code. Every changed line traces to the request.
- **Goal-driven execution.** Turn the task into a verifiable goal before changing code: a bug
  fix starts with a failing test or a reproducible check; a refactor keeps relevant tests green
  before and after. Run the narrowest command that proves the change, then broaden when
  shared contracts, boundaries or user-facing flows changed.
- **Git is the owner's job.** Never commit, push, rebase or run destructive git commands. The
  working tree may contain the owner's changes; never revert or overwrite them.
- **Report honestly:** what changed, where, what verification ran, what could not be verified,
  and any remaining risk. Never claim success without verification.

---

## Workflow

### Before coding

1. Decide whether the change is **transport, orchestration, mapping, engine logic or UI
   assembly**, and choose the owning layer first.
2. Check whether it touches public contracts in `packages/shared` (then: schema, ack, both
   i18n catalogues, server test, client test).
3. Read the plan document that owns the task (`docs/plans/2026-10-project-review/00-index.md`
   says which) and the `docs/rules/*.md` file for the layer you change. Nothing else.
4. Use the project skills in `.claude/skills/` for recurring procedures instead of
   re-deriving them: `verify`, `add-socket-action`, `add-ui-component`, `add-hint`,
   `write-tests`, `e2e-scenario`, `plan-status`, `archive-doc`, `design-token-migration`,
   `perf-check`, `device-checklist`. Every code change ends with `verify`; every plan task
   ends with `plan-status`.

### Review before finishing

- Did gameplay rules end up in the wrong layer? Did we preserve server authority?
- Did a large file get larger instead of being split? Did we duplicate boundary logic or mapping?
- Did we improve or weaken testability? Did we protect mobile performance and touch quality?
- Did we add a literal where a token, constant or i18n key exists? Can a future reader find
  the logic quickly?

### Testing

- **Game engine:** deepest tests — placement, challenge outcomes, turn progression, same-year
  edge cases, player removal in every phase.
- **Server orchestration:** room lifecycle, reconnect and host transfer, authorisation, timer
  resolution, state mapping.
- **Realtime boundary:** schema validation, event-to-service wiring, client-safe errors,
  acks and `requestId` replay, broadcasts.
- **Frontend:** unit tests for pure helpers and selectors; component tests (jsdom + RTL)
  for rendered behaviour; E2E for create, join, place, challenge, reveal, win and recovery.
- Green gate: `npm run typecheck && npm run lint && npm test`, plus `npm run e2e` when
  realtime, navigation or overlay flows changed. No real sleeps in tests; use fake timers.
