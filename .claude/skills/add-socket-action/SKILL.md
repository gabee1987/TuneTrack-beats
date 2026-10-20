---
name: add-socket-action
description: Add or change a client-to-server Socket.IO action end to end (shared event name, Zod schema, server handler with ack and requestId idempotency, service method, client emitAction call, error mapping, i18n keys, tests). Use when a feature needs a new room action or a new payload field.
---

# add-socket-action

Rules: `CLAUDE.md` → Architecture Principles; `docs/rules/backend_engineering_rules.md` §1–§4,
§6–§7; `docs/rules/frontend_engineering_rules.md` §4 and §8. Server is the source of truth,
validation happens at the boundary, every mutation is acknowledged.

## Checklist (all of it, in this order)

### 1. `packages/shared`

- `src/events/clientEvents.ts`: add the event to `ClientToServerEvent`
  (`PascalCase: "snake_case"`).
- `src/events/schemas/<area>Schemas.ts` (lobby, gameplay, playlist or spotify): add
  `<name>PayloadSchema` built from `commonSchemas.ts` (`roomIdSchema`, `optionalRequestIdSchema`)
  and `src/constants/gameplay.ts`, with `<Name>Payload = z.input` and `<Name>PayloadParsed =
z.output` next to it. Never write a payload interface by hand.
- `src/events/clientPayloads.ts`: import and re-export `<Name>Payload` and add it to
  `PayloadsByEventKey`; a missing entry does not compile, and `emitAction` takes its payload
  type from this map.
- If the server replies with data, add the payload type and event to `src/events/serverEvents.ts`.
- `src/index.ts` re-exports every module; add a case to `src/events/schemas.test.ts` when the
  schema has non-trivial bounds.
- Run `npm run build -w @tunetrack/shared` before running the server or the E2E suite.

### 2. `apps/server`

- Service method on the owning service: `RoomLobbyService`, `RoomDeckService`,
  `RoomGameplayService` or `RoomConnectionService` (`rooms/`), `PlaylistOrchestrator` (`decks/`) or
  `SpotifyOrchestrator` (`spotify/`); handlers reach them through `RoomServices`. Authorise (host,
  membership, phase) **before** any side effect. Game rules go to `packages/game-engine`,
  never into `rooms/` or a handler.
- Handler in the matching file under `realtime/handlers/` (`lobbyHandlers.ts`,
  `gameplayHandlers.ts`, `playlistHandlers.ts`, `spotifyHandlers.ts`) through
  `createSocketHandler({ socket, event, schema, invalidPayload, log, handle, idempotency, fallbackErrorCode, errorMessages })`.
  Copy `registerSkipTurnHandler` in `gameplayHandlers.ts`: a mutation passes
  `idempotency: roomActionIdempotency(services, socket, event)`. An async service call is
  returned from `handle`; never hand-roll `socket.on`. A request/result event (the client
  waits on a result event, not an ack) adds `failureReply`, as `spotifyHandlers.ts` does.
- `handle` calls the service and then `broadcastRoomState(io, state)`; call
  `broadcastRoomDirectory(io, services)` only when lobby-visible data changed.
- Error codes are `UPPER_SNAKE` members of `SERVER_ERROR_CODES` (`packages/shared`
  `errors/serverErrors.ts`), thrown as `new DomainError("CODE")` (engine rules:
  `GameRuleError`). A plain `Error` reaches the client as the handler's fallback code. Add the
  message map to `realtime/errorMessages.ts` (server-side fallback; the client localises).
- `realtime/registerSocketHandlers.ts` changes only when you add a new handler file.

### 3. `apps/web`

- Call through `services/socket/emitAction.ts` from a page hook. On the game page, add the
  action to its family in `pages/GamePage/hooks/actions/` (placement, challenge, TT, room) and
  submit it through `useAckedAction`, which owns pending, retry and failed. Render the result states
  `ok | rejected | timeout | offline`; a component never emits a raw socket event.
- Map every new error code in `features/i18n/localizedErrors.ts` (`SERVER_ERROR_KEY_BY_CODE`)
  and add the key to **both** `features/i18n/languages/en.properties` and `hu.properties`;
  the `i18nKeyParity` guard fails otherwise.
- Hidden information: never render a field the server does not send during `turn` or
  `challenge`.

### 4. Tests (all four layers)

| Layer    | Where                                                            | Proves                                             |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| shared   | `packages/shared/src/events/schemas.test.ts`                     | bounds, optional `requestId`                       |
| server   | `apps/server/tests/rooms/*.test.ts`                              | authorisation, phase check, resulting state        |
| realtime | `apps/server/tests/realtime/createSocketHandler.test.ts` pattern | invalid-payload ack, replayed `requestId` same ack |
| web      | hook test beside the hook, using `src/test/fakeSocket.ts`        | pending → ok, rejected code → catalogue message    |

Fixtures use placeholder data only (`TEST_ROOM_1`, `Player One`, `player-host`).

### 5. Verify

Run `/verify` with the "packages changed" scope (build both packages, run every workspace).
Add an E2E scenario with `/e2e-scenario` when the action is part of a user-visible flow.

## Red flags — stop and move the code

- The handler contains an `if` about game phase or player identity → belongs in the service.
- The service mutates a timeline or token count → belongs in the engine.
- A new English literal appears in a component → i18n key.
- The payload carries data the server can derive (host id, current phase) → remove it.
