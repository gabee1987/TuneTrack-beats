# TuneTrack Backend Engineering Rules

> Purpose: define the backend/server coding rules for TuneTrack so the server stays clean, robust, teachable, and easy to evolve without corrupting gameplay integrity or architecture quality.
>
> This document is intentionally practical. It defines what belongs where, how backend responsibilities should be separated, and what standards future backend changes must follow.

## 1. Status Of This Document

This document is the backend engineering standard for:

- `apps/server`
- backend-facing contracts and orchestration choices
- server interactions with `packages/game-engine` and `packages/shared`

This document complements, not replaces:

- [tunetrack_full_architecture.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/tunetrack_full_architecture.md)
- [tunetrack_technical_implementation_plan.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/tunetrack_technical_implementation_plan.md)
- [frontend_engineering_rules.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/frontend_engineering_rules.md)

If a backend implementation conflicts with the architecture documents, the architecture documents win.

## 2. Core Intent

TuneTrack backend must be:

- server-authoritative
- deterministic where game rules are concerned
- modular
- easy to test
- safe to extend
- clear enough to teach from

The backend is not just a transport layer. It protects the integrity of the game. That means architecture quality here is directly tied to fairness, maintainability, and correctness.

## 3. Non-Negotiable Principles

Every backend change must reinforce these principles:

- Server is the single source of truth.
- Game rules belong in the game engine, not in Socket.IO handlers.
- Transport concerns belong at the edges.
- Validation must happen at boundaries.
- Orchestration must stay separate from pure rule logic.
- State transitions must be explicit and traceable.
- Clear module boundaries beat convenience imports.
- Deterministic game behavior beats ad hoc mutation.
- Readability and correctness beat local cleverness.

## 4. Backend Architecture Overview

The backend is split into distinct responsibilities:

- `app/`
  Application bootstrap and infrastructure wiring.

- `http/`
  HTTP-only routes such as health checks.

- `realtime/`
  Socket.IO event registration and protocol boundary handling.

- `rooms/`
  Room lifecycle, membership, orchestration, and room state mapping.

- `decks/`
  Deck loading, parsing, normalization, and deck-related services.

- `packages/game-engine`
  Pure gameplay logic. No Socket.IO, no Express, no storage, no environment access.

- `packages/shared`
  shared types, event contracts, validators, constants, and payload schemas.

## 5. Layer Ownership Rules

### 5.1 `app/`

Owns:

- environment loading
- server creation
- dependency composition
- startup wiring

Must not own:

- game rules
- room mutation logic
- socket payload business decisions

### 5.2 `realtime/`

Owns:

- socket event registration
- payload parsing through shared schemas
- mapping domain/service errors to client-safe server errors
- broadcasting updated room state

Must not own:

- core game rules
- room state mutation logic
- deck construction logic
- duplicated authorization decisions that belong in services or orchestration layers

### 5.3 `rooms/`

Owns:

- room lifecycle
- player membership and reconnect handling
- challenge/reveal timers
- orchestration between room state and game engine state
- mapping internal game state to public room state

Must not own:

- raw socket event parsing
- low-level network concerns
- large amounts of pure gameplay rule calculation that belong in the engine

### 5.4 `decks/`

Owns:

- deck loading from files or future providers
- deck validation
- transforming deck records into game-engine track cards

Must not own:

- room mutation logic
- socket concerns
- gameplay state transitions

### 5.5 `packages/game-engine`

Owns:

- rules
- legal state transitions
- placement evaluation
- challenge/reveal outcomes
- deterministic turn progression

Must not own:

- timers
- sockets
- persistence
- environment access
- logging side effects
- HTTP or transport concerns

### 5.6 `packages/shared`

Owns:

- public contracts
- payload schemas
- shared constants
- shared public/private type definitions where appropriate

Must not own:

- React code
- Express/Socket.IO runtime code
- room orchestration
- gameplay orchestration

## 6. Backend File Size And Complexity Limits

These are soft limits, but they should be treated seriously.

- handler file target: under 200-250 lines
- service/orchestrator target: under 250-350 lines
- state-mapping module target: under 200 lines
- utility/helper target: under 150 lines
- if a file exceeds 350 lines, we must ask why
- if a file exceeds 500 lines, splitting is strongly preferred
- if a file approaches 700+ lines, it is architectural debt unless there is a very strong reason

Current note:

- `RoomRegistry` is already large enough that future work should reduce its surface area instead of adding more responsibilities there

## 7. Rules For Socket Handling

Socket handlers are protocol adapters.

They should do only this:

1. receive payload
2. parse and validate payload
3. call a service or orchestrator
4. emit resulting room state or client-safe error

Socket handlers should not:

- contain business rules
- mutate room state directly
- duplicate authorization rules from services
- perform deep branching about gameplay outcomes

### 7.1 Preferred Structure

Long term, event handling should move toward:

- one small registration function per event
- shared helper for parse-and-handle pattern
- centralized error mapping

This keeps event definitions readable and uniform.

## 8. Validation Rules

Validation must happen at boundaries.

Use `zod` schemas from `packages/shared` for:

- socket payload parsing
- environment variable validation

Rules:

- never trust raw socket payloads
- validate before service invocation
- do not sprinkle ad hoc runtime validation throughout business logic if the boundary already owns that responsibility

## 9. State And Mutation Rules

Backend state mutation must be explicit.

Rules:

- every room mutation should happen through a clearly named method
- state changes must flow through a narrow orchestration surface
- state mutation must be easy to reason about from one method to the next
- avoid hidden mutation through helper side effects

Prefer:

- returning new state snapshots where practical
- isolating mutation to one owning class or service
- pure mapping functions for public state projection

Avoid:

- changing many unrelated maps or records in scattered helper calls
- partially mutating room state before an operation is known to be valid
- mixing membership bookkeeping, game flow, timers, and transport semantics in one branch when they can be separated

## 10. Domain Boundary Rules

The most important backend rule is this:

- gameplay rules go in the game engine
- orchestration goes in the server

Examples:

- "is this slot valid?" belongs in `packages/game-engine`
- "who is allowed to send this event?" belongs in server orchestration
- "how do we map internal state to public payload?" belongs in server mapping
- "when should a challenge timer auto-resolve?" belongs in server orchestration

## 11. Error Handling Rules

Backend errors should be:

- explicit
- predictable
- safe to surface
- easy to map to user-facing messages

Rules:

- do not throw vague generic errors when a domain-specific error code is possible
- use stable error codes for important failure categories
- keep transport-safe messaging separate from internal implementation details
- never leak stack traces or internals to clients

Recommended direction:

- move toward typed application/domain error categories instead of raw strings over time

## 12. Mapping Rules

Mapping between internal and public state must be centralized and pure.

Examples:

- `mapGameStateToPublicRoomState`
- `mapTimelineCardToPublicTimelineCard`
- `mapTrackCardToPublicTrackCard`

Rules:

- mapping functions should not mutate source state
- mapping functions should not perform orchestration
- mapping functions should not reach into unrelated infrastructure
- mapping functions should be easy to test in isolation

## 13. Timer And Lifecycle Rules

Timers are orchestration concerns and must be handled carefully.

Rules:

- timer creation and cleanup must be centralized
- every timer must have a clear owner
- every timer must have a clear cleanup path
- timeout behavior must check current state again before mutating, because state may have changed since scheduling

Avoid:

- timer logic buried inside unrelated methods
- forgetting cleanup on room close or transition
- relying on stale assumptions captured at schedule time

## 14. Persistence And Repository Rules

Even though MVP uses in-memory state, architecture must remain persistence-ready.

Rules:

- do not hardwire domain logic to in-memory storage details
- keep storage concerns behind replaceable abstractions where meaningful
- do not let temporary in-memory shortcuts leak into game-engine rules

For MVP:

- in-memory orchestration is acceptable
- repository abstractions should be introduced where they simplify future replacement, not as empty ceremony

## 15. Logging Rules

Logging should support operations and debugging without polluting domain logic.

Use logging for:

- startup
- shutdown
- socket connect/disconnect
- unexpected errors
- notable room lifecycle events

Do not:

- log every tiny successful branch without value
- couple gameplay engine decisions to logger access
- use logs instead of tests for confidence

## 16. Naming Rules

Names must communicate responsibility clearly.

Prefer:

- `RoomService`
- `RoomRegistry`
- `registerSocketHandlers`
- `mapGameStateToPublicRoomState`

Avoid:

- `manager2`
- `doRoomThing`
- `miscHandler`
- `tempState`

Methods should read like real domain or orchestration actions:

- `claimChallenge`
- `resolveChallengeWindow`
- `removePlayerBySocketId`

## 17. Duplication Rules

Do not tolerate copy-paste drift across backend flows.

If many handlers repeat the same pattern:

- centralize the parse/error/broadcast flow

If many methods repeat the same room membership checks:

- centralize membership helpers

If many features repeat public-state mapping:

- centralize the mapper

But:

- do not build a generic abstraction that hides meaning if the duplication is still small and readable

## 18. Testing Rules

Backend must be heavily testable because correctness matters.

### 18.1 Game Engine

Game engine should carry the deepest correctness tests because that is where the rules live.

Test:

- placement correctness
- challenge outcomes
- reward outcomes
- turn progression
- edge cases around same-year cards and challenge behavior

### 18.2 Server Orchestration

Test:

- room lifecycle
- reconnect behavior
- authorization
- timer-driven resolution
- mapping from internal state to public state

### 18.3 Realtime Boundary

Test:

- schema validation
- event-to-service wiring
- client-safe error messages
- room broadcasts after successful state changes

## 19. Backend Refactor Rules For Current Codebase

The current backend is functionally solid, but some files are carrying too much orchestration weight.

The biggest candidate is `RoomRegistry`.

### 19.1 Preferred Refactor Direction For Server

Target future split:

- `RoomMembershipService`
  join, restore, reconnect, remove, host reassignment

- `RoomGameOrchestrator`
  place, challenge, reveal, TT actions, public-state updates

- `RoomTimerCoordinator`
  challenge timers and deferred removal timers

- `RoomStateMapper`
  internal-to-public projections

- `SocketEventRegistrar`
  common parse/handle/error/broadcast adapter

This should be incremental. Do not rewrite everything at once.

### 19.2 Current Direction Rule

From now on:

- do not add large new responsibilities directly into `RoomRegistry` if they can live in a narrower collaborator
- prefer extraction over extension when modifying already-large backend files

## 20. Performance Rules

Backend performance matters, but correctness comes first.

Rules:

- avoid unnecessary cloning in hot paths if it harms performance significantly
- avoid repeated work inside high-frequency room operations
- use efficient maps for room/session tracking where appropriate
- keep payloads minimal and intentional

Do not:

- prematurely optimize by making code unreadable
- sacrifice deterministic correctness for small perceived speed gains

## 21. Security And Trust Rules

Even in a party-game MVP, the server must assume clients are untrusted.

Rules:

- never trust client-side permissions
- never trust client-computed correctness
- validate membership and phase before mutation
- keep all scoring and rule decisions server-side

## 22. PR And Change Rules

Every backend change should be explainable in these terms:

- what responsibility changed
- which layer owns that responsibility
- why the chosen location is correct
- whether the change increased or reduced coupling

Before merging backend work, ask:

- Did we put gameplay rules in the wrong layer?
- Did we make a large file larger instead of extracting?
- Did we duplicate boundary logic?
- Did we preserve server authority?
- Did we improve or weaken testability?
- Did we make the public contract clearer or murkier?

## 23. Practical Checklist For Future Iterations

### 23.1 Before Coding

- identify whether the change is transport, orchestration, mapping, or engine logic
- choose the owning layer first
- define whether the change affects public contracts

### 23.2 During Coding

- validate at boundaries
- keep orchestration explicit
- keep engine logic pure
- keep mapping centralized
- keep timer ownership clear

### 23.3 Before Finishing

- scan for duplicated checks
- scan for file growth
- scan for mixed concerns
- scan for public-state leakage
- scan for missing tests

## 24. Rule For Future Codex Iterations

When modifying the backend, future work should explicitly follow this document.

That means:

- prefer extraction over accumulation in large orchestration files
- keep Socket.IO handlers thin
- keep game rules in the engine
- keep backend code suitable as a teaching example

## 25. Immediate Next Step Recommendation

The next backend refactor should likely focus on reducing the responsibility load inside `RoomRegistry` and standardizing Socket.IO handler patterns.

Suggested first backend refactor batch:

1. extract public room-state mapping into a dedicated mapper module
2. extract challenge and disconnect timer coordination into a dedicated coordinator
3. introduce a reusable handler helper for parse-call-broadcast-error socket flows
4. reduce `RoomRegistry` to room state ownership plus coordination between smaller collaborators

This should be done incrementally, not as a risky rewrite.
