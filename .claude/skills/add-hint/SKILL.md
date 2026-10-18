---
name: add-hint
description: Add, change or remove a first-run onboarding hint in apps/web/src/features/hints (registry entry, HintId, en/hu keys, anchor placement, priority, test). Use when a screen needs a one-time explanation bubble or an existing hint text changes.
---

# add-hint

Normative catalogue rules: `docs/plans/2026-10-project-review/18-onboarding-hint-system.md`
§2. Read that section first; it is short.

## 0. Should this be a hint at all?

A hint explains something **not discoverable** from the UI. If the control can say what it
does, fix the control and stop. Hints form a first-game tutorial: one on screen at a time, 1.5 s after arrival and after each
acknowledgement, only while the anchor is half on screen and no overlay covers it
(`hintCoordinator.ts` and `useFirstRunHint.ts` enforce this; do not re-implement it).

## 1. Files to touch (all in `apps/web/src/features/hints/`)

| File              | Change                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `hintState.ts`    | add the id to the `HintId` union. Ids are stable `kebab-case`, scoped by screen (`lobby-start`, `game-tokens`) and **never reused**. |
| `hintRegistry.ts` | add `{ id, priority, titleKey, bodyKey }`. Lower priority shows first within a screen.                                               |

Catalogue keys follow `hints.<camelCaseId>.title` / `.body` in **both**
`features/i18n/languages/en.properties` and `hu.properties`. Title one line, body at most two.
`hints.dismiss` already exists.

Do not touch `hintCoordinator.ts`, `hintScheduler.ts`, `useFirstRunHint.ts` or
`HintBubble.tsx` for an ordinary hint. Storage is `tunetrack.hints.v1`; bump
`hintStateVersion` only if the shape of `HintState` changes.

## 2. Place it

```tsx
const [anchor, setAnchor] = useState<HTMLElement | null>(null);
<div className={styles.primaryActionBar} ref={setAnchor}>
  <Button …>{label}</Button>
  <FirstRunHint anchor={anchor} id="lobby-start" isEligible={isHost} />
</div>
```

Pattern: `pages/LobbyPage/components/LobbyStartDock.tsx`. The anchor is the wrapping
element (primitives do not forward refs); the bubble positions itself relative to it.
`isEligible` is a fact from
the controller (`isHost`, `hasTimelineCards`), never a hard-coded `true` unless the hint is
unconditional. The bubble must not cover the control it describes nor the screen's primary
action; the dismiss control is at least 48 × 48 px (owner decision 2).

## 3. Priority guidance

| Screen | Existing ids and priorities                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lobby  | `lobby-share-code` 5, `lobby-music` 10, `music-needs-check` 15, `lobby-start` 20                                                                                         |
| Game   | `game-drag-preview` 10, `game-confirm` 20, `game-challenge` 25, `game-timeline-tap` 30, `game-next-song` 35, `game-tokens` 40, `game-timeline-switch` 45, `game-menu` 50 |

Slot a new hint between neighbours; do not renumber existing ones.

## 4. Test

One of:

- a component test beside the host component with fake timers: render with
  `renderWithProviders`, make the hint eligible, call `triggerIntersection(true)`
  (`test/stubs/observers.ts`) so the anchor counts as on screen, advance 1.5 s and assert the
  `status` named by the hint title appears (pattern: `LobbyInviteCard.test.tsx`);
- or an E2E assertion in `apps/e2e/tests/hints.spec.ts` (E15; it is the only spec that
  opens devices with hints on, through `test.use({ hints: true })`).

`hintState.test.ts` and `hintScheduler.test.ts` need no change for a new id.

## 5. Finish

`/verify` for `@tunetrack/web` (the `i18nKeyParity` guard catches a missing `hu` key). Update
`18-onboarding-hint-system.md` §1 hint count with `/plan-status`; no changelog.
