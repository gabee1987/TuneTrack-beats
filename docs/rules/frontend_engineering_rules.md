# TuneTrack Frontend Engineering Rules

> Scope: `apps/web`. [`CLAUDE.md`](../../CLAUDE.md) owns the layer table, core architecture
> rules, coding principles, file-size rule, motion principles and testing expectations;
> [`design_system.md`](./design_system.md) owns tokens, primitives, layering and accessibility.
> This file adds only the web-specific structural rules. Where documents disagree, the stricter
> rule applies and the conflict is raised. Rewritten 2026-10-06 (documentation reset).

## 1. Layer responsibilities

| Layer                              | May                                                                       | Must not                                                           |
| ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `app/`                             | define routes, route order, lazy loading, page transitions, global styles | contain page logic or socket wiring                                |
| `pages/<Page>/<Page>.tsx`          | pick the assembly for the layout mode and hand it the controller result   | render UI itself                                                   |
| `pages/<Page>/mobile/`, `desktop/` | assemble sections for one layout                                          | derive state, subscribe to sockets, own timers                     |
| `pages/<Page>/hooks/`              | controller, selectors, transition coordinators, action handlers           | import Framer Motion or presentational components                  |
| `pages/<Page>/components/`         | render narrow props, format for display                                   | read stores or raw room state when the controller can pass a model |
| `features/*`                       | cross-page capabilities with their own small API surface                  | depend on a page                                                   |
| `services/*`                       | wrap browser APIs, storage, the socket, external SDKs                     | import components, CSS or page code                                |
| `hooks/`                           | generic hooks used by more than one page                                  | hold page-specific orchestration                                   |

Boundary violations to refuse in review: a component importing `services/socket`, a page
reading `localStorage`, a controller importing `framer-motion`, a service importing React.

## 2. Page folder shape

```
pages/LobbyPage/
  LobbyPage.tsx                 # chooses mobile or desktop assembly via usePageLayoutMode
  LobbyPage.types.ts
  lobbyHeaderSelectors.ts       # pure selectors, unit-tested beside the file
  hooks/
    useLobbyPageController.ts   # one controller; splits into focused hooks when it grows
    useLobbyRoomConnection.ts
  components/                   # presentational pieces used by both assemblies
  mobile/                       # mobile assembly and mobile-only sections
  desktop/                      # desktop assembly and desktop-only sections
```

- `usePageLayoutMode` is the only switch between assemblies; no media queries decide what
  logic runs. The mobile assembly never imports the desktop one and vice versa.
- CSS modules sit next to the component they style; a page never owns one giant module.
- Page-local hooks and selectors stay under the page. A hook promoted to `hooks/` or
  `features/` must have a second consumer.

## 3. Controller and view-model flow

- Server state enters the page through one connection hook (`use<Page>RoomConnection`) and
  one controller. The controller derives view flags, labels, selected entities, action
  enablement and variants; components receive **narrow props**, never the raw
  `PublicRoomState`.
- Repeated boolean derivation is a selector, tested once, not copied into components.
- A controller that grows past its soft limit splits into: selectors, an actions hook, a
  timeline or view-model hook, and transition coordinators. It never returns an
  unstructured bag; group results into named bundles.
- Memoisation is deliberate: a `React.memo` component whose parent recreates its handlers
  on every render is a defect, not an optimisation. Stabilise handlers at the controller
  or drop the memo.
- Hidden information rule: the client never infers or displays an answer it is not sent;
  debug-only exposure must be explicit and behind a flag.

## 4. Realtime client rules

- Server events define truth. Optimistic UI only where clearly safe and reversible.
- Every mutation goes through `services/socket/emitAction.ts`: it attaches a `requestId`,
  awaits the ack with bounded retry, and surfaces `pending`, `success` and typed error
  states. Components render those states; they never emit raw socket events.
- Socket subscriptions are attached and cleaned up in one connection hook per page. No
  presentational component subscribes to the socket.
- Connection state (`connecting`, `connected`, `reconnecting`, `disconnected`, `recovered`)
  is one typed state owned by one hook, rendered by one banner component, and never a set
  of scattered string literals.
- Room navigation (join, create, lobby → game, room closed) is owned by
  `features/rooms/roomNavigation.ts`. Navigation caused by state that no longer exists
  uses `replace`; navigation chosen by the user uses `push`.
- The durable session id (`services/session`) is never deleted by a room-closed handler;
  only the room-scoped membership is cleared.

## 5. Overlays and history

- Each dismissible overlay (settings, music setup, playlist editor, track editor, sheets,
  dialogs) pushes **one same-path router-state history entry** when it opens. Browser or
  Android Back removes that entry and closes only the topmost overlay; programmatic close
  uses the same path. Blocking overlays ignore Back, Escape and scrim taps.
- Route transitions are keyed by pathname, so a same-path entry never remounts the page or
  rebuilds its socket connection.
- Closing an overlay removes its portal; hidden interactive DOM must not survive.
- Overlays restore focus to their trigger, trap focus while open, lock body scroll and close
  on Escape. These behaviours come from the shared overlay primitives, not from each caller.
- Layering uses the `--z-*` tokens only (see `design_system.md` §6).

## 6. Motion architecture

- Framer imports live in `features/motion` or in dedicated animation components; page
  controllers never import Framer Motion.
- One coordinator per interaction type (preview replacement, celebration, action surfaces,
  token flyouts). Shared variants and timing live in `features/motion`, grouped by
  transition responsibility, never in a generic bucket file.
- **Backend-driven transitions:** the controller (or a dedicated transition-event hook with
  pure detectors) emits a typed transition event; a coordinator hook owns the displayed data
  and the animation phase and decides when the new server data becomes visible; the
  component renders the coordinator output. Incoming props never replace displayed content
  while local timers try to animate around it. Timing comes from a named motion contract,
  not an inline timeout.
- Performance: animate `transform` and `opacity`; no `layout` animation on page containers
  or list rows on mobile; no animated `filter`, `backdrop-filter` or shadows; no always-on
  decorative animation during gameplay; reduced motion through the shared helper only.

## 7. Styling

- CSS Modules with design tokens for every colour, surface, shadow, radius, spacing and
  z-index. Literal hex, rgba and z-index values are defects guarded by
  `src/test/guards/noHardcodedColors.test.ts` (allowlist may only shrink).
- Never spread-merge CSS modules into a barrel (`noCssBarrels.test.ts`).
- Class names describe role, not appearance. No vague names (`box`, `item2`, `temp`).
- Viewport: one viewport store owns `resize`/`visualViewport` listeners and `--app-height`;
  components read from it rather than adding listeners.

## 8. Internationalisation

- All user-visible text comes from the `.properties` catalogues under `features/i18n`;
  every key exists in **both** `en` and `hu` (`i18nKeyParity` guard). No English literals in
  components, including connection and error states.
- Error codes from the server map to catalogue keys in one place.

## 9. Storage

- Durable preferences and the player profile live in the Zustand stores under
  `features/preferences` and `features/profile`; hints use their own storage module. Each
  storage key has exactly one owner module; no second module reads or writes it.
- Volatile game session state is never persisted. Saved playlists live in
  `services/savedPlaylists`, never in room settings.

## 10. Error handling

- Never assume a value exists when the server contract allows `null`; derive defensively.
- User-facing messages are deliberate catalogue strings, never raw thrown errors.
- Missing room state, stale state and transient socket loss each have a defined rendering
  (loading, recovery, offline) rather than a blank or frozen screen.

## 11. Performance

- Keep render trees small; pass stable, narrow props. Add `useMemo`/`useCallback` only for a
  measured repeated cost with clear invalidation.
- Drag and gesture code avoids state churn and per-event layout reads; @dnd-kit owns drag.
- No polling intervals for display state when the data source can notify.
- Heavy or rarely used dependencies (Framer Motion features, Zod, non-default locale) load
  lazily; the eager bundle budget is set by the live performance plan.

## 12. Web tests

In addition to `CLAUDE.md` → Testing:

- Use the shared harness in `src/test/`: `renderWithProviders`, `fakeSocket`,
  `fakeSpotifyPlayer`, `roomStateFixtures`. Do not hand-roll providers in a test.
- Pure selectors and detectors get unit tests beside the file; components get behaviour
  tests (user-visible result, not implementation); coordinators get fake-timer tests.
- Guard tests under `src/test/guards/` are part of the green gate; shrinking an allowlist is
  a visible, reviewed change.
- E2E scenarios live in `apps/e2e`, one file per scenario, against the fake Spotify server.
- Placeholder data only in fixtures and snapshots.
