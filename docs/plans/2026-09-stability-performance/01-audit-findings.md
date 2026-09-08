# 01 — Audit Findings Register

> **Audit date:** 2026-09-08 · **Commit:** `37ccf20` · **Scope:** whole monorepo
> Every finding below was confirmed by reading the referenced source. Where a finding is
> an inference rather than a direct read, it is labelled **(hypothesis)** and carries a
> named verification step.

Severity scale:

| Level | Meaning |
| --- | --- |
| **S1** | Breaks a game session, loses state, or blocks the user with no recovery. |
| **S2** | Wrong behaviour or a significant performance/stability cost, but recoverable. |
| **S3** | Maintainability, consistency or latent-risk issue with no current user impact. |

---

## 1. Startup and bundle

### F-01 · S2 · framer-motion is on the eager critical path

`vendor-motion` is 116.84 kB raw / 39.01 kB gzip and is listed in
`apps/web/dist/index.html` as a `modulepreload`, so it downloads before the home screen
paints. Two always-mounted modules pull it in:

- `apps/web/src/app/AppRoutes.tsx` imports `MotionPresence` and `PageTransition`, both of
  which import `framer-motion` directly.
- `apps/web/src/features/loading/AppLoadingOverlay.tsx` imports `motion` and is rendered
  unconditionally by `AppLoadingProvider`, which wraps the whole app in
  `apps/web/src/app/App.tsx`.

The home screen's only motion is a decorative background and a page slide. Remediation in
Doc 02 section 3.

### F-02 · S2 · Zod ships to the browser and is never used

`vendor-zod` is 54.88 kB raw / 12.61 kB gzip. No file under `apps/web/src` references a
Zod schema or imports `zod` (verified by grep). The cause is a combination of:

- `packages/shared/src/index.ts` is a single barrel that re-exports
  `./events/schemas.js`, which evaluates ~60 top-level `z.object(...)` calls.
- `packages/shared/package.json` does **not** declare `"sideEffects": false`, so Rollup
  cannot prove the barrel's re-exports are removable.

The same applies to `packages/game-engine/package.json`. Remediation in Doc 02 section 4.

### F-03 · S2 · Both translation catalogues are parsed at boot

`apps/web/src/features/i18n/languages/index.ts` lines 1-2 import
`./en.properties?raw` and `./hu.properties?raw` (615 lines each) and immediately call
`parseLanguageResource` on both at module-evaluation time. Consequences:

- roughly 40 kB of raw text is embedded in the entry chunk `index-*.js` (110.26 kB);
- both catalogues are string-split, trimmed, filtered and reduced into objects on the
  main thread before the first paint, for a user who will only ever read one of them.

Remediation in Doc 02 section 5.

### F-04 · S2 · CSS-module barrels defeat per-component CSS splitting

Six modules merge several CSS modules into one default export via object spread:

| Barrel | CSS modules merged |
| --- | --- |
| `apps/web/src/pages/LobbyPage/components/spotify/spotifyStyles.ts` | 5 |
| `apps/web/src/pages/LobbyPage/lobbyPageStyles.ts` | 3 |
| `apps/web/src/pages/LobbyPage/components/playlistEditModalStyles.ts` | 2 |
| `apps/web/src/pages/GamePage/gamePageStyles.ts` | 4 |
| `apps/web/src/pages/GamePage/components/timelineStyles.ts` | 3 |
| `apps/web/src/pages/GamePage/components/gamePageActionPanelsStyles.ts` | 2 |

Importing any one component therefore loads every stylesheet in its barrel. This is the
direct cause of the two oversized CSS chunks: `LobbyRoomActions` 68.96 kB and
`TimelinePanel` 41.96 kB. It also forces Rollup to hoist the whole Spotify component
family into one 79.84 kB JS chunk.

Secondary latent risk: spreading multiple CSS modules silently resolves duplicate class
names by import order. There are currently **no** duplicates (verified across all six
barrels), but nothing prevents one being introduced. Remediation in Doc 02 section 6,
guard test in Doc 11 section 4.

### F-05 · S3 · One generic route fallback is reused for every route

`apps/web/src/app/components/AppRouteFallback.tsx` renders a single fixed skeleton
(header row, hero block, three lines, one action block) and is used as the Suspense
fallback for Home, Play, Join, Lobby and Game. On Lobby and Game the structure does not
resemble the real page, so the skeleton reads as a flash of unrelated content.
`apps/web/src/pages/GamePage/GamePage.tsx` lines 53-62 instead renders a plain
`<h1>{t("game.loading")}</h1>` while `roomState` is null. Remediation in Doc 07 section 6.

---

## 2. Runtime performance

### F-06 · S2 · Virtualised playlist rows are spring-animated on every scroll frame

`apps/web/src/pages/LobbyPage/components/PlaylistTrackList.tsx` lines 38-58 wraps every
virtual row in `motion.div` with `animate={{ y: virtualItem.start }}` and a spring
transition. `virtualItem.start` changes on every scroll tick, so each visible row runs an
independent physics simulation while the user scrolls a list that may hold hundreds of
tracks. This is the heaviest single scroll cost in the app and contradicts the
`CLAUDE.md` rule that framer-motion decorates state transitions rather than driving
continuous layout.

### F-07 · S2 · Timeline reorder animation is 860 ms

`apps/web/src/pages/GamePage/gamePage.constants.ts` line 4 sets
`TIMELINE_REORDER_DURATION_MS = 860`, applied to every sortable timeline item in
`TimelineSortableItem.tsx`. `CLAUDE.md` specifies 200-350 ms for most transitions and up
to 500 ms only for large-screen entries or celebrations. Line 6 sets
`TIMELINE_REORDER_THROTTLE_MS = 180`, so a slow drag can queue a new reorder roughly
every fifth of a second while an 860 ms animation is still running, compounding the jank.

### F-08 · S2 · Viewport-derived state is duplicated and unthrottled

`apps/web/src/hooks/usePageLayoutMode.ts` registers its own `resize` listener and holds
its own `useState`. It is called independently by `GamePage`, `GamePageHeader`,
`TimelinePanel`, `HomePage`, `LobbyPage` and others, so a single resize (including every
frame of an iOS address-bar collapse) triggers several unbatched state updates across
separate subtrees. There is no throttling and no `visualViewport` handling.

Separately, `apps/web/src/main.tsx` line 35 attaches an unthrottled `resize` listener
that writes `--app-height` on `documentElement`, forcing a style recalculation of the
whole document on each event. The listener is never removed.

### F-09 · S2 · A one-second interval re-renders the playback provider subtree

`apps/web/src/pages/GamePage/hooks/useSpotifyPlaybackSdk.ts` runs
`window.setInterval(..., 1000)` whenever `enabled` is true and calls `setPosition` on each
tick. `position` flows out through `useHostPlayback` into `HostPlaybackProvider`'s context
value, so every consumer re-renders once per second for the whole game — including when
no progress indicator is on screen. A second interval fires `requestToken()` every
55 minutes, which is correct but should be consolidated.

### F-10 · S2 · A global capture-phase pointer listener runs on every touch

`apps/web/src/pages/GamePage/hooks/HostPlaybackProvider.tsx` adds
`window.addEventListener("pointerdown", handlePointerDown, true)` while host playback is
enabled, calling `activateElement()` on the Spotify player for every pointer-down
anywhere in the app. The intent (keeping autoplay armed) is sound, but a capture-phase
global listener on the primary interaction path is both a per-touch cost and a plausible
contributor to the iOS drag problems in F-14. **(hypothesis on the drag interaction)** —
verify by disabling the listener on a physical iPhone and re-testing card drag.

### F-11 · S3 · Full room state is broadcast on every mutation

`apps/server/src/realtime/registerSocketHandlers.ts` lines 17-22 emit the complete
`PublicRoomState` to the whole room on every state change. `PublicRoomState`
(`packages/shared/src/game/roomState.ts` lines 58-71) contains `players`, every player's
`timelines`, `revealState`, `history` and `settings`. History is capped at 30 entries per
the earlier phase-5 work, but the whole object is still re-serialised and re-sent for
every token award, settings toggle, connection change and placement. At six players with
ten-card timelines this is a multi-kilobyte payload per event on a mobile connection.

---

## 3. Backend stability and session ownership

### F-12 · S1 · In-game disconnects are never cleaned up

`apps/server/src/rooms/RoomConnectionService.ts` lines 35-59:

    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.timers.scheduleReconnect(...)   // removal only scheduled in lobby
    }

    return roomState;

A player who disconnects **during a game** is marked disconnected and given a 180-second
`reconnectExpiresAtEpochMs` (from `IN_GAME_RECONNECT_DISPLAY_MS`, line 25) but **no timer
is ever scheduled**. Consequences:

- the UI counts down to an expiry that never happens;
- a player who closes the tab and never returns remains in `players` and `timelines`
  indefinitely, still counted in the player list and standings;
- the room is never removed, because removal only happens inside
  `removePlayerBySessionId` when the last player leaves — a path that is only reached from
  the lobby timer. This is an unbounded in-memory leak per abandoned game.

This also contradicts the `CLAUDE.md` rule "Last player leaves → room removed".

### F-13 · S1 · A host reconnect re-issues `create_room` and fails

`apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts` lines 107-118 define
`handleConnect`, which emits `CreateRoom` when `intent === "create"` and `JoinRoom`
otherwise. `handleConnect` is registered as the `"connect"` listener, so it also runs on
**every Socket.IO reconnect**. On the server,
`apps/server/src/rooms/RoomLobbyService.ts` lines 45-52 throw `ROOM_ALREADY_EXISTS`
whenever the room exists. A host whose phone briefly loses Wi-Fi therefore reconnects
into a hard error and cannot re-enter their own lobby. This is the most likely source of
the reported "network inconsistencies".

### F-14 · S1 · Session identity is destroyed on closed-room reset

`useLobbyRoomConnection.ts` lines 87-96 and
`apps/web/src/pages/GamePage/hooks/useGameRoomConnection.ts` lines 49-57 both call
`resetPlayerSession()` inside `handleClosedRoomReset`.
`apps/web/src/services/session/playerSession.ts` lines 66-69 removes the durable
`tunetrack.playerSessionId` from both `localStorage` and `sessionStorage`. The next room
the user joins gets a brand-new identity, so any server-side session membership that
still existed is orphaned and unreachable. Clearing the *room* should not clear the
*device identity*.

### F-15 · S2 · Language changes tear down the socket and rejoin the room

Both room-connection effects list the i18n `t` function in their dependency arrays:

- `useLobbyRoomConnection.ts` line 236: `[displayName, intent, navigate, playerSessionId, roomId, t]`
- `useGameRoomConnection.ts` line 152: `[navigate, playerSessionId, rememberedDisplayName, roomId, t]`

`t` is a `useCallback` keyed on `languageId` (`apps/web/src/features/i18n/I18nProvider.tsx`
lines 73-76), so switching language re-runs the whole effect: listeners are removed,
re-attached, and a fresh `CreateRoom`/`JoinRoom` is emitted. Combined with F-13 this means
a host who changes language mid-lobby is thrown out with `ROOM_ALREADY_EXISTS`. `t` is
only needed for error localisation and belongs in a ref.

### F-16 · S2 · Socket.IO server is not configured for mobile networks

`apps/server/src/app/createSocketServer.ts` sets only `cors` and `maxHttpBufferSize`.
Missing:

- `connectionStateRecovery` (Socket.IO 4.6+), which would transparently restore session
  and missed packets across short drops — precisely the mobile case this game lives in;
- `pingInterval` / `pingTimeout` tuning for backgrounded mobile browsers;
- any per-socket event rate limiting.

### F-17 · S3 · Two layers of pass-through indirection over the room services

`apps/server/src/rooms/RoomRegistry.ts` is 285 lines of which almost all are one-line
delegations to `RoomLobbyService`, `RoomGameplayService` or `RoomConnectionService`.
`apps/server/src/rooms/RoomService.ts` (696 lines) then wraps `RoomRegistry` again with a
second set of near-identical delegations, adding only logging and Spotify orchestration.
Every new event must be threaded through both. This is the largest maintainability tax on
the server and the reason `RoomService` is at the file-size soft limit.

### F-18 · S3 · `RoomStore` uses linear scans over all sockets in the process

`apps/server/src/rooms/RoomStore.ts` iterates the full `socketMemberships` or
`sessionMemberships` map in eight methods: `hasSocketMembershipForSession`,
`clearOtherSocketMembershipsForSession`, `deleteSocketMembershipsForSession`,
`findSessionIdForPlayer`, `getSessionIdsInRoom`, `collectAndClearSocketIdsForPlayer`,
`retargetMembershipsToRoom` and `clearMembershipsForRoom`. Correct at party scale;
a hard ceiling on the "scale to online play" goal in `CLAUDE.md`.

### F-19 · S3 · No graceful shutdown, and timers are unreferenced

`apps/server/src/index.ts` registers no `SIGTERM`/`SIGINT` handler: on a Railway or
Render redeploy the process dies without notifying connected clients or flushing the
Axiom sink. Separately, both timer managers call `handle.unref()`
(`DisconnectTimerManager.ts` line 10, `ChallengeTimerManager.ts` line 9), so a pending
challenge-window or reconnect timer will not keep the process alive and is silently lost
on shutdown.

### F-20 · S3 · Room capacity is a hardcoded constant

`apps/server/src/rooms/RoomLobbyService.ts` line 36 sets
`MAX_ACTIVE_ROOM_COUNT = 5`, unreachable from configuration. Grace periods in
`RoomRegistry.ts` lines 38-40 are constructor defaults but are never overridden from
`env`, so they cannot be tuned per deployment either.

---

## 4. Client network resilience

### F-21 · S2 · No acknowledgements on any client-to-server action

Every client action is a bare `socket.emit` with no ack callback — for example
`apps/web/src/pages/LobbyPage/hooks/useLobbyRoomActions.ts` lines 33-39, and every handler
in `apps/web/src/pages/GamePage/hooks/useGamePageActions.ts`. The client cannot tell
whether an action was received, applied, rejected or dropped. Failure surfaces only as a
generic `Error` event with no correlation to the originating action, or as silence. This is
the structural reason the app "feels" unreliable on a weak connection.

### F-22 · S2 · The socket client has no reconnection or auth configuration

`apps/web/src/services/socket/socketClient.ts` creates the client with
`io(url, { autoConnect: false })` only. There is no backoff configuration, no
`auth: { sessionId }` payload (so the server cannot identify the device at handshake
time and must wait for an application-level join), and no offline action queue.

### F-23 · S3 · Connection status strings are untranslated

`useLobbyRoomConnection.ts` sets `connectionStatus` to the literals `"Connecting"`,
`"Connected"` and `"Disconnected"`. These reach the UI directly, bypassing the i18n
layer, so Hungarian users see English status text.

### F-24 · S2 · `GAME_ALREADY_STARTED` on rejoin has no recovery path

`apps/server/src/rooms/RoomLobbyService.ts` line 123 throws `GAME_ALREADY_STARTED` when a
session with no server-side membership tries to join a running game. On the client,
`useGameRoomConnection.handleError` only special-cases `ROOM_NOT_FOUND` and
`ROOM_MEMBERSHIP_NOT_FOUND` (`isClosedRoomError`, line 158). `GAME_ALREADY_STARTED`
becomes an ordinary error toast on a page with no room state, leaving the player on a
dead screen. This is reachable whenever the server has restarted, or after F-12's missing
cleanup finally gets implemented.

---

## 5. Navigation and overlay layering

### F-25 · S1 · The song editor opens beneath the playlist editor's own header

`apps/web/src/pages/LobbyPage/components/playlistEditChrome.module.css`:

| Selector | Line | Declaration |
| --- | --- | --- |
| `.overlay` | 4 | `z-index: 1200` |
| `.sheet::after` | 28 | `z-index: 2` |
| `.header` | 42-43 | `position: relative; z-index: 4` |
| `.detailsOverlay` | 92-94 | `position: absolute; z-index: 2` |
| `.detailsOverlayFullscreen` | 101-102 | `position: fixed; z-index: 1400` |

`PlaylistEditModal.tsx` line 128 renders `PlaylistTrackDetailsSheet` with the default
`presentation="contained"` (`PlaylistTrackDetailsSheet.tsx` line 29), so the details
overlay is `z-index: 2` inside a sheet whose own header is `z-index: 4`. The parent
header therefore paints over the top of the details sheet, covering its close button and
intercepting the taps meant for it. The same component works correctly from
`SpotifyOpenedPlaylistPanel.tsx` line 246 and `SpotifyCandidateReviewPanel.tsx` line 224,
which both pass `presentation="fullscreen"` and get `z-index: 1400`.

### F-26 · S2 · The exiting page is painted above the entering page on back navigation

`apps/web/src/features/motion/coreMotionTokens.ts` lines 38-41:

    exit: (direction) => ({
      x: `${direction * -100}%`,
      zIndex: direction === -1 ? 2 : 1,
    }),

`apps/web/src/app/AppRoutes.tsx` computes `direction = -1` for any navigation to a lower
route order — including `navigate("/", { replace: true })` from the game or lobby. With
`MotionPresence mode="sync"` (line 46) both pages are mounted simultaneously, and the
**exiting** page holds `zIndex: 2` for the full 320 ms transition while the entering page
starts at `zIndex: 1`. This matches the reported symptom that the page navigates
underneath while the old surface stays on top.

### F-27 · S1 · Overlays are invisible to browser and hardware back

No overlay in the app participates in history. `AppShellMenu` (settings), `RoomResetModal`,
`PlaylistEditModal`, `PlaylistTrackDetailsSheet`, `SpotifySetupModal`, `SongInfoModal`,
`BottomSheet` and the kick-confirmation dialog are all pure `useState` booleans rendered
through `createPortal`. Pressing back while any of them is open navigates the underlying
route instead of closing the overlay. Grep for `popstate`, `history.pushState` and
`useBlocker` across `apps/web/src` returns nothing.

### F-27b · S1 · The reset modal stays visible after its own button navigates away

`RoomResetModal` is rendered *inside* the page tree — `apps/web/src/pages/GamePage/GamePage.tsx`
lines 46-51 and `apps/web/src/pages/LobbyPage/LobbyPage.tsx` lines 24-28 — and portals
itself to `document.body` at `z-index: 1500`
(`features/ui/RoomResetModal.module.css` line 4).

`handleClosedRoomReset` (`useGameRoomConnection.ts` lines 49-57) performs
`setHasClosedRoomReset(false)` and `navigate("/", { replace: true })` in the same handler.
React batches both into one render pass, in which `location.key` changes and
`AnimatePresence` (`AppRoutes.tsx` line 46, `mode="sync"`) marks the old `PageTransition`
as *exiting*. Framer Motion renders an exiting child from its **previously captured
element**, so the exiting subtree never receives `isOpen={false}`. The portal therefore
keeps painting the modal above both pages until the 320 ms page transition finishes and
the whole subtree unmounts.

This is the reported "when I touch its button the page is navigating underneath but the
modal stays there". The class of fault is structural: **page-scoped overlays that portal
above the page-transition layer**. Doc 06 section 4 moves every overlay into a single
app-level host mounted outside the transition tree, which removes the class rather than
this instance.

### F-27c · S2 · Home screen becomes unresponsive after closing a room · **(hypothesis)**

Reported symptom: after closing a room and returning home, the Start button does not
respond until a full page refresh. Static reading identifies three candidate mechanisms,
all in the same structural area as F-27b:

1. **An exiting `PageTransition` that never unmounts.** `PageTransition` is
   `position: absolute; inset: 0; min-height: var(--app-height); z-index: 2`
   (`features/motion/PageTransition.tsx`). If its `AnimatePresence` exit never completes,
   it covers the home screen permanently and swallows every pointer event. Under
   `mode="sync"` this is the known failure mode when the presence key changes again while
   a child is still exiting. `handleRoomClosed` (`useGameRoomConnection.ts` lines 109-127)
   navigates from a socket-event callback and, unlike `handleClosedRoomReset`, does **not**
   pass `replace: true`, so a second navigation can land during the first exit.
2. **A stuck portal overlay.** Any overlay left mounted with `pointer-events: auto`
   (`RoomResetModal` at 1500, `AppLoadingOverlay` at 1600) blocks input. The loading
   overlay has a 120-second self-timeout, which would read as "permanent" to a user.
3. **A rejected socket handshake after `resetSocketClient()`.** `handleStart` calls
   `preloadSocketClient()`, and `PlayPage` immediately connects. If the previous
   disconnect has not settled, the new client may connect but the room list never
   arrives, leaving the page apparently inert.

**Diagnostic procedure (do this before implementing a fix):**

- Reproduce on a device, then in DevTools inspect `document.body` children and
  `document.querySelectorAll('[style*="position: absolute"]')` for a leftover
  `PageTransition` node.
- Add a temporary `onExitComplete` log to `AppRoutes`' `AnimatePresence` and confirm
  whether it fires for the game route.
- Check `getComputedStyle(document.elementFromPoint(x, y))` at the Start button's
  coordinates to identify what is actually receiving the tap.

Doc 06 sections 3-4 addresses all three candidates: `onExitComplete`-guarded transitions,
a single app-level overlay host, and an explicit socket lifecycle. Record the confirmed
mechanism in Doc 12 item B10 before changing code.

### F-28 · S2 · The z-index space has no single scale

`apps/web/src/features/theme/tokens/primitives.ts` lines 74-83 define a clean scale
(`base 0`, `sticky 100`, `nav 200`, `overlay 300`, `sheet 400`, `dialog 500`,
`toast 600`, `celebration 700`), and four files use the resulting `--z-*` variables.
Everything else uses raw literals. The literals in current use are
`-1, 0, 1, 2, 3, 4, 5, 7, 8, 10, 12, 20, 30, 130, 880, 900, 1100, 1200, 1400, 1500, 1600, 5000`
across 40+ declarations, i.e. the actual stacking order is an order of magnitude above
the token scale's ceiling and cannot be reasoned about. F-25 is a direct symptom.

### F-29 · S2 · The settings panel flickers on open

Three compounding causes in the `AppShellMenu` chain:

1. `apps/web/src/features/app-shell/AppShellMenu.tsx` renders the dialog inside
   `<Suspense fallback={null}>`. On the first open the chunk (`AppShellMenuDialog`
   8.55 kB) must download, so the trigger produces nothing at all for a moment. The hover
   and `onTouchStart` preloads help on desktop but a tap starts the fetch and the click in
   the same gesture.
2. `apps/web/src/features/motion/MotionPresence.tsx` defaults `initial = false`, so
   `AppShellMenuDialog`'s `MotionPresence` skips the enter animation entirely — the sheet
   appears with no transition.
3. `apps/web/src/features/app-shell/components/AppShellMenuSheet.tsx` lines 47-88 measures
   scroll overflow in a `useEffect` plus a `ResizeObserver` and then sets `showTopFade` /
   `showBottomFade`. Both start `false`, so the top and bottom fade gradients appear one
   frame after paint. The active-tab pill (lines 130-144) also animates opacity 0 to 1 on
   mount, so it fades in every time the menu opens.

---

## 6. Design system

### F-30 · S2 · Four parallel button systems

| System | Location | Used by |
| --- | --- | --- |
| `Button` (primitives) | `features/ui/primitives/Button.tsx` | 9 of 69 page components |
| `ActionButton` | `features/ui/ActionButton.tsx` + `FormControls.module.css` | Playlist editor, track details, room actions |
| `RoomPrimaryActionButton` / `RoomDangerActionButton` | `features/ui/Room*ActionButton.tsx` | Lobby and Home forms |
| Ad-hoc page CSS | e.g. `styles.menuActionButton` + `styles.menuKickPlayerButton` in `pages/GamePage/gameMenu/GameMenuPlayerItem.tsx` lines 210-216, 288-294 | Game menu |

This is the direct cause of the reported mismatch between the player-remove button, the
token-remove control and the close-room button: they are three different components with
three different stylesheets.

### F-31 · S2 · Two icon-button and two dialog systems

`features/ui/primitives/IconButton.tsx` (used by the `Dialog` primitive) and
`features/ui/CloseIconButton.tsx` are separate implementations of the same control with
separate stylesheets. Similarly `features/ui/primitives/Dialog.tsx` (via
`MotionDialogPortal`), `features/ui/BottomSheet.tsx` and the bespoke portal inside
`PlaylistEditModal.tsx` are three different modal shells.

### F-32 · S2 · The leaderboard chip's outline is clipped

`apps/web/src/pages/GamePage/gamePageChrome.module.css`:

- `.headerLeadersStrip` (lines 222-228): `display: flex; overflow-x: auto;` with **no
  block padding**. Setting `overflow-x: auto` makes `overflow-y` a scroll container too,
  so anything painted outside the content box in the block direction is clipped.
- `.headerLeaderChip` (lines 242-251): `outline: 1px solid var(--color-border-subtle)`.
  An outline paints *outside* the border box.

The bottom outline edge therefore falls in the clipped region. This is the reported cut-off
bottom border. The `Chip` primitive uses a border rather than an outline, which is also the
inconsistency to resolve.

### F-33 · S3 · Token adoption is low and 94 colours are hardcoded

`CLAUDE.md` requires colours, surfaces and shadows to come from design tokens with no
hardcoded values. Current state across `apps/web/src/**/*.module.css`:

- 94 hardcoded hex literals, concentrated in `spotifySetupShell.module.css` (10),
  `gamePagePlayback.module.css` (9), `RoomPrimaryActionButton.module.css` (9),
  `AppLoadingOverlay.module.css` (9);
- roughly 300 raw-pixel `padding` / `margin` / `gap` / `border-radius` values where a
  `--space-*` or `--radius-*` token exists;
- 185 distinct `var(--*)` tokens are in use, so the token layer exists and is good —
  the gap is adoption, not design.

### F-34 · S2 · Skeleton loading exists on one page only

`Skeleton` (primitives) is used in `pages/JoinRoomPage/JoinRoomPage.tsx` lines 39-40 and
in the dev-only design-system page. Nowhere else. Combined with F-05 this means Home,
Play, Lobby and Game have no structure-matching loading state.

---

## 7. Drag and drop

### F-35 · S1 · Touch drag competes with scrolling on iOS

`apps/web/src/pages/GamePage/components/TimelinePanel.tsx` lines 122-128 configure a
single sensor:

    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } })

with `DRAG_ACTIVATION_DISTANCE_PX = 4` (`gamePage.constants.ts` line 1). Contributing
factors:

- A 4 px *distance* constraint activates on essentially any finger movement, so a scroll
  gesture and a drag gesture are indistinguishable at the moment of activation.
- The scroll container `.timelineRow` sets `-webkit-overflow-scrolling: touch` and
  `scroll-snap-type: y proximity` in the mobile portrait block
  (`timelinePanelShell.module.css` lines 355-370) and `touch-action: pan-x` in the
  landscape block (line 414). On iOS Safari, `-webkit-overflow-scrolling: touch` hands the
  gesture to the compositor's momentum scroller, which can claim the touch before dnd-kit's
  pointer handler runs.
- `touch-action: none` is present, but only on `.previewCardDraggable`
  (`timelineCards.module.css` lines 140-145). Any touch that lands on padding, on the
  wrapper `.timelineItem`, or on inner text nodes outside that element is not covered.

The standard remedy is a coarse-pointer `TouchSensor` with a `delay`/`tolerance`
constraint so a quick swipe scrolls and a short hold drags. Detail in Doc 12 item B4.

---

## 8. Spotify

### F-36 · S1 · Spotify authorisation is scoped to a single room and discarded with it

`apps/server/src/spotify/SpotifyTokenStore.ts` keys `hostTokensByRoomId` by `RoomId` in a
plain in-memory `Map`. `apps/server/src/rooms/RoomService.ts` line 327 calls
`clearHostTokens(roomId)` inside `closeRoom`, and the map is lost entirely on server
restart. Every new room therefore requires a fresh OAuth round trip. This is the reported
"I have to log in every single time".

### F-37 · S2 · Playback start position is not pinned

`apps/server/src/spotify/SpotifyApiClient.ts` lines 523-538 send
`PUT /me/player/play` with body `{ uris: [...] }` and **no `position_ms`**. When the same
URI is already the device's current track and is paused part-way through, Spotify may
resume from its retained position rather than restarting. This is the reported
"sometimes it starts mid song".

Reinforcing this, `useSpotifyPlaybackSdk.waitForPlayingUri` short-circuits to `true` when
`currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current`, so an
already-playing identical URI is treated as a successful start with no seek.

### F-38 · S1 · A finished track cannot be restarted

`apps/web/src/pages/GamePage/hooks/useHostPlayback.ts` `resume()`:

    if (sdkHasActiveContext) {
      sdkResume();
      return;
    }

`hasActiveContext` is set to `true` on the first `player_state_changed`
(`useSpotifyPlaybackSdk.ts`) and is **never cleared while the player stays connected**.
When a single-URI context finishes, Spotify reports `paused: true` with an exhausted
queue; `player.resume()` then has nothing to resume. Because `hasActiveContext` is still
`true`, the fallback branch that would re-issue `playTrack(uri)` is unreachable. This is
exactly the reported "if the song finishes while the card is still in a placement state I
cannot restart the song".

There is also no `restart`/`playTrack` member on the `HostPlaybackState` contract
(`useHostPlayback.ts` lines 9-19), so no UI control can express "play this again".

### F-39 · S2 · Autoplay failure has no user-facing recovery

`useSpotifyPlaybackSdk` logs `autoplay_failed` to the console and fails the pending
confirmation. `useHostPlayback` retries on the ladder `[0, 2500, 6000]` ms and then gives
up silently. `HostPlaybackState` exposes no `needsUserGesture` flag, so the UI cannot
prompt "tap to start". This is the reported "sometimes I have to manually start the song"
— with no affordance telling the host that is what is required.

---

## 9. Room creation and player identity

### F-40 · S2 · Player identity lives inside the room-creation form

`apps/web/src/pages/PlayPage/PlayPage.tsx` renders the display-name field inside the
create-room `<form>`, and `usePlayPageController.ts` line 17 seeds it with
`DEFAULT_DISPLAY_NAME` (`"Player 1"`) rather than `getRememberedPlayerDisplayName()`.
`apps/web/src/pages/JoinRoomPage/JoinRoomPage.tsx` line 17 does the same. The remembered
name **is** written (`rememberPlayerDisplayName` is called on submit) and **is** read by
Lobby and Game, but never used to seed the two forms where the user actually types it.
So the name is persisted and then ignored.

### F-41 · S2 · Renaming yourself in the lobby re-joins the room

`apps/web/src/pages/LobbyPage/mobile/LobbyPageMobile.tsx` `applySetupChanges` lines
59-93: a name change calls `identity.onPlayerProfileChange` **and then** navigates to
`/lobby/:roomId?playerName=<new>`. That query parameter feeds `displayName` in
`useLobbyPageController.ts` line 39, which is a dependency of the socket effect (F-15), so
the socket listeners are torn down and a fresh `CreateRoom`/`JoinRoom` is emitted for what
should be a simple profile update.

### F-42 · S3 · Dead code in the Home page area

- `apps/web/src/pages/HomePage/components/JoinRoomForm.tsx` (149 lines) has no importers.
  Its styles occupy a large part of `HomePage.module.css` (409 lines).
- `apps/web/src/pages/LobbyPage/hooks/useLobbySpotify.ts` is a two-line re-export shim over
  `./spotify/useLobbySpotify`, adding an import hop for nothing.

### F-43 · S2 · There is no in-game metadata correction path

`apps/server/src/rooms/RoomLobbyService.ts` `updateImportedDeckTrack` (lines 326-370)
mutates only `roomRecord.importedDeck` — the future draw pool. It does not touch
`roomRecord.gameState`, `roomRecord.trackCardsById`, the drawn `currentTrackCard`, or the
`revealState` correctness verdict. A host who sees a wrong Spotify release year at reveal
has no way to correct it or re-evaluate the placement. Implementing the requested manual
override requires a new event, engine support and a mapper change (Doc 09 section 5).

---

## 10. Testing

### F-44 · S1 · Component testing is installed but not wired up

`apps/web/package.json` declares `@testing-library/react`, `@testing-library/jest-dom`
and `@testing-library/user-event`, but `apps/web/vitest.config.js` sets only
`include`, `passWithNoTests` and `pool`. There is no `environment: "jsdom"` and no
`setupFiles`, so no component can be rendered in a test. All 101 web tests are
pure-function tests. Every overlay, dialog, drag interaction and skeleton in this
programme is therefore currently unverifiable.

### F-45 · S1 · No end-to-end coverage

No Playwright, Cypress or equivalent anywhere in the repo. The core multiplayer loop —
create, join, place, challenge, reveal, win, reconnect — has never been exercised end to
end automatically.

### F-46 · S2 · Untested server and engine areas

Server tests cover room flow, challenge flow, host transfer, TT actions, playback handoff,
mappers, `RoomStore`, the socket-handler factory, playlist import and several Spotify
helpers. Not covered:

- `RoomConnectionService` disconnect/reconnect **during a game** (the F-12 defect area);
- `SpotifyAuthService`, `SpotifyDiscoveryService`, `SpotifyMusicSearchService`;
- `realtime/handlers/*` wiring beyond the generic factory;
- `createSocketServer` configuration;
- graceful shutdown.

### F-47 · S3 · No coverage measurement or thresholds

No workspace configures `coverage` in its Vitest config, and there is no CI gate. There is
no objective signal about which of the changes in this programme are covered.

---

## 11. Findings-to-plan map

| Finding | Addressed in |
| --- | --- |
| F-01, F-02, F-03, F-04, F-05 | Doc 02 |
| F-06, F-07, F-08, F-09, F-10, F-11 | Doc 03 |
| F-12, F-16, F-17, F-18, F-19, F-20 | Doc 04 |
| F-11, F-13, F-14, F-15, F-21, F-22, F-23, F-24 | Doc 05 |
| F-25, F-26, F-27, F-27b, F-27c, F-28, F-29 | Doc 06 |
| F-30, F-31, F-32, F-33, F-34, F-05 | Doc 07 |
| F-36, F-37, F-38, F-39 | Doc 08 |
| F-40, F-41, F-42, F-43 | Doc 09 |
| (no existing hint system) | Doc 10 |
| F-44, F-45, F-46, F-47 | Doc 11 |
| F-25, F-26, F-27, F-27b, F-27c, F-29, F-32, F-35, F-37, F-38, F-39, F-40 | Doc 12 (defect list) |
