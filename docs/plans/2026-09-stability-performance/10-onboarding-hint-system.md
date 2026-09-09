# 10 — Interactive First-Run Hint System

> New capability. Nothing comparable exists in the codebase: a search for
> `onboard`, `tutorial`, `coachmark`, `firstRun` and `hintSystem` across
> `apps/web/src` returns no results.
> Owning layer: `apps/web/src/features/hints` (new).
> Depends on Doc 06 (overlay host) and Doc 07 phases 1-2 (primitives).

## 1. Requirement

As stated by the product owner:

> "I want an interactive hint system where on the first use of the app, but only then (it
> can be reset in the settings) various gameplay and usage related hints and tutorials come
> up on the live UI. For example: when the game starts, a hint comes up that we can tap the
> already placed cards for more info. All these should be subtle and easily closable
> though."

Four hard constraints follow, and they should be treated as acceptance criteria rather than
aspirations:

1. **Contextual** — anchored to the real control on the live UI, not a slideshow up front.
2. **Once only** — shown once per hint, never again, unless reset.
3. **Resettable** — a control in settings restores every hint.
4. **Subtle and easily dismissible** — never blocking, never a wall of text, always
   closable with an obvious gesture.

## 2. Design

### 2.1 What a hint is

    interface HintDefinition {
      id: HintId;                          // stable, never reused
      anchorId: string;                    // the anchor the hint points at
      titleKey: TranslationKey;
      bodyKey: TranslationKey;
      placement: "top" | "bottom" | "start" | "end";
      trigger: HintTrigger;
      priority: number;                    // lower shows first when several qualify
      maxShowCount?: number;               // default 1
    }

    type HintTrigger =
      | { kind: "anchor_visible" }                                  // the target is on screen
      | { kind: "game_phase"; phase: RoomStatus }                   // e.g. first "turn"
      | { kind: "first_time_condition"; condition: HintConditionId } // e.g. first own timeline card
      | { kind: "manual" };                                         // opened from a help action

Hints are **declarative data**, not imperative calls scattered through components. That is
the difference between a hint system and 20 one-off `useState` flags.

### 2.2 Architecture

    apps/web/src/features/hints/
      hintRegistry.ts        // the HintDefinition[] catalogue          (pure, tested)
      hintState.ts           // zustand store: seen counts, enabled flag (persisted)
      hintScheduler.ts       // pure: given state + context, which hint is next  (tested)
      HintProvider.tsx       // wires scheduler to the app; owns the queue
      HintAnchor.tsx         // registers a DOM node under an anchorId
      HintBubble.tsx         // the visual coach mark
      useHintAnchor.ts       // hook form of HintAnchor for existing components
      hints.test.ts

Key decisions:

- **One hint at a time.** The scheduler is a queue, not a set. Two coach marks at once is
  noise.
- **The scheduler is pure.** `selectNextHint(state, context) => HintId | null` takes the
  seen-counts, the enabled flag, the visible anchors and the game context, and returns at
  most one id. All the ordering and gating logic is therefore unit-testable with no DOM.
- **Anchors are registered, not queried.** A component wraps its control in `HintAnchor`
  (or calls `useHintAnchor("timeline-card")` and spreads a ref). No `querySelector`, no
  brittle CSS-selector coupling.
- **Anchor visibility comes from `IntersectionObserver`,** one observer for all anchors, so
  the cost is bounded and there is no polling.
- **Rendering goes through the overlay host** (Doc 06 section 4) as `kind: "hint"` at
  `--z-hint`, so hints sit above content, below toasts, and below blocking overlays — and
  so back dismisses the current hint rather than navigating.

### 2.3 Persistence

    interface HintState {
      version: number;                          // bump to re-show everything after a redesign
      enabled: boolean;                         // master switch
      seenCounts: Record<HintId, number>;
      completedAtMs: Record<HintId, number>;
    }

- Stored under `tunetrack.hints.v1` through the hardened `deviceStorage` helper
  (Doc 05 section 2).
- A `version` mismatch resets `seenCounts`. This is how a future UI change re-teaches the
  changed part without a manual reset.
- Storage failure (private window, blocked storage) must degrade to "hints enabled, nothing
  remembered", never to a crash. That is the third time this pattern appears in the
  programme, which is why the shared helper matters.

### 2.4 Visual design

Per the "subtle" constraint, and consistent with Doc 07:

- A small pointer bubble: one line of title, at most two lines of body, one dismiss
  affordance. Maximum width roughly 280 px.
- Built from `Card` and `IconButton` primitives with a `--z-hint` layer and a token-driven
  arrow. No new colour values.
- Optional soft spotlight on the anchor — a subtle ring rather than a dark full-screen mask.
  A dimming mask is the standard coach-mark pattern but it is the opposite of subtle, and it
  would block the live gameplay the hint is describing.
- Motion: emphasised-decelerate on enter, emphasised-accelerate on exit, 200-250 ms, from
  the shared motion tokens. Under `prefers-reduced-motion`, a plain fade.
- Dismiss on: the dismiss button, a tap anywhere outside the bubble, Escape, back, or
  interacting with the anchored control itself (that last one is important — if the user has
  already worked out what the control does, the hint should get out of the way).
- Auto-dismiss after roughly 12 s of no interaction, counted as seen. A hint the user
  ignored should not persist.
- Touch target for dismiss at least 44 x 44 px per `CLAUDE.md`.

## 3. Initial hint catalogue

Deliberately small. A first-run experience with 15 hints is not onboarding, it is an
obstacle. Start with these, measure whether they are needed, and add only on evidence.

| id | Anchor | Trigger | Message intent |
| --- | --- | --- | --- |
| `home-start` | Start button on Home | `anchor_visible`, only when `!hasCompletedSetup` | Host or join a game from here. |
| `profile-name` | Identity row on Home | `anchor_visible`, only when the name is still the default | This is how everyone sees you — tap to change it. |
| `lobby-spotify` | Spotify section in the lobby | `anchor_visible`, host only, no playlist imported | Connect Spotify to play real tracks. |
| `lobby-start` | Start-game dock | `anchor_visible`, host only, at least two players | Everyone is in — start when ready. |
| `game-timeline-tap` | Any placed timeline card | `game_phase: "turn"`, first time the player has a card | **The example the owner gave:** tap a placed card for track details. |
| `game-drag-preview` | Preview card | `first_time_condition: "first_own_turn"` | Drag the card into the right place on your timeline. |
| `game-confirm` | Confirm action in the turn dock | `first_time_condition: "first_slot_selected"` | Confirm when you are happy with the spot. |
| `game-challenge` | Challenge action | `game_phase: "challenge"`, first time, requires at least one TT token | Spend a token to challenge this placement. |
| `game-tokens` | Token counter in the header | `first_time_condition: "first_token_received"`, TT mode on | Tokens buy skips, extra cards and challenges. |
| `game-menu` | Menu trigger in the game header | `anchor_visible`, first game | Settings, players and history live here. |

Ten hints, each one line, each anchored to a real control, each answering a question a
first-time player actually has.

Rules for the catalogue:

- Every hint must describe something **not discoverable** from the UI alone. If a button
  says what it does, it does not need a hint. Review the catalogue against this rule before
  implementing — some of the ten may not survive it, which is a good outcome.
- Hints never appear during the first 1.5 s of a screen, so a screen never opens with a
  bubble already on it.
- At most 2 hints per screen visit, so a first game is not a guided tour.
- A hint never covers the control it describes, nor the primary action of the screen.

## 4. Settings integration

In the app shell menu, a "Help and hints" section:

- **Show hints** toggle (`enabled`) — some players will want them off immediately.
- **Reset hints** action — sets all `seenCounts` to 0 and shows a confirmation toast. This
  is the reset the owner asked for.
- **Replay the walkthrough** — sets the manual-trigger hints into the queue in catalogue
  order, so a returning player can be re-taught without waiting for each trigger.
- Show a count ("3 of 10 hints seen") so the state is legible rather than mysterious.

The section uses the `SettingRow` primitive from Doc 07 section 3, so it needs no bespoke
styling.

## 5. Implementation sequence

| Step | Work | Verification |
| --- | --- | --- |
| 1 | `hintState.ts`, `hintRegistry.ts` (empty catalogue), `hintScheduler.ts` | Pure unit tests for the scheduler: gating, priority, once-only, disabled, version reset, storage failure |
| 2 | `HintAnchor` / `useHintAnchor` + the shared `IntersectionObserver` | Component test: anchor registers and unregisters; visibility drives the store |
| 3 | `HintBubble` + overlay-host integration | Component test: renders, positions to each placement, dismisses on all five gestures, respects reduced motion |
| 4 | Settings section | Component test: toggle, reset, count |
| 5 | Add the three Home / Lobby hints and their anchors | Component tests per hint trigger |
| 6 | Add the six Game hints and their anchors | Component tests; E2E for `game-timeline-tap` since it is the owner's stated example |
| 7 | Copy pass in `en.properties` and `hu.properties` | A test asserting every `HintId` in the registry has both a title and a body key present in **both** catalogues — this is the guard that stops a hint shipping with a raw key visible |

Steps 1-4 build the mechanism with no product surface, which means they can land safely and
early. Steps 5-6 are then cheap and reviewable one hint at a time.

## 6. Anchors needed in existing components

Each is a one-line addition, listed so the work is visible:

| Component | Anchor id |
| --- | --- |
| `pages/HomePage/mobile/HomePageMobile.tsx` (Start button) | `home-start` |
| Home identity row (new, Doc 09 section 2.2) | `profile-name` |
| `pages/LobbyPage/components/spotify/LobbySpotifySection.tsx` | `lobby-spotify` |
| `pages/LobbyPage/components/LobbyHostStartPanel.tsx` | `lobby-start` |
| `pages/GamePage/components/TimelineSortableItem.tsx` (first non-preview card) | `game-timeline-tap` |
| `pages/GamePage/components/PreviewCard.tsx` | `game-drag-preview` |
| `pages/GamePage/components/TurnActionDock.tsx` | `game-confirm` |
| `pages/GamePage/components/ChallengeActionPanel.tsx` | `game-challenge` |
| `pages/GamePage/components/GamePageHeader.tsx` (token counter) | `game-tokens` |
| `features/app-shell/AppShellMenu.tsx` (trigger) | `game-menu` |

`game-timeline-tap` needs care: it must anchor to *one* card, not all of them. Anchor to the
first placed card by index, and only when the viewed timeline is the player's own.

## 7. Accessibility

- The bubble is `role="dialog"` with `aria-labelledby`/`aria-describedby`, provided by the
  overlay host.
- It does **not** steal focus. A coach mark that grabs focus mid-game is hostile; instead
  it is announced through an `aria-live="polite"` region so a screen-reader user hears it
  without losing their place.
- The dismiss button is reachable by keyboard, and Escape always works.
- Hints are suppressed entirely when the anchor is not visible, so a screen reader is never
  told about something off-screen.

## 8. Bundle cost

The mechanism is small (a store, a pure scheduler, one observer, one bubble component) but
it should not sit on the eager path. Load `features/hints` lazily, gated on
`enabled && hasUnseenHints`, so a returning player who has seen everything downloads
nothing. Registry and copy stay in the same lazy chunk.

Budget: **under 6 kB gzip** for the whole feature including the registry. If it exceeds
that, the catalogue is too large.

## 9. Acceptance criteria

- [ ] A fresh install shows at most two hints per screen, none within 1.5 s of arrival.
- [ ] Each hint appears exactly once and never again.
- [ ] "Reset hints" makes all ten eligible again.
- [ ] "Show hints" off suppresses everything immediately.
- [ ] Every hint dismisses via button, outside tap, Escape, back, and interaction with its
      anchor.
- [ ] No hint covers the control it describes or the screen's primary action.
- [ ] Every hint has copy in both `en` and `hu`; the guard test enforces it.
- [ ] Under `prefers-reduced-motion` hints fade rather than move.
- [ ] Blocked storage degrades to enabled-but-unremembered with no error.
- [ ] Feature chunk under 6 kB gzip and lazily loaded.
- [ ] E2E: a first-run session reaches a placed card and sees `game-timeline-tap`.

## 10. Risk register

| Risk | Mitigation |
| --- | --- |
| Hints obstruct gameplay at exactly the wrong moment | One at a time; never over the anchor or the primary action; auto-dismiss; dismiss on anchor interaction; hard cap of two per screen visit. |
| The catalogue grows into a tutorial nobody reads | The "not discoverable from the UI" rule, applied at review. Adding a hint should prompt the question of whether the UI itself should be clearer. |
| Anchors drift as components are refactored | Anchor ids are registered by the component that owns the control, so a moved component takes its anchor with it. A test asserts every registry `anchorId` is registered somewhere at runtime in the E2E first-run flow. |
| Hint state resets unexpectedly and re-teaches an experienced player | `version` bumps are deliberate and reviewed; storage failures degrade to unremembered rather than to a reset loop, and the cap prevents a barrage. |
| Copy ships as raw keys | The both-catalogues guard test in step 7. |
