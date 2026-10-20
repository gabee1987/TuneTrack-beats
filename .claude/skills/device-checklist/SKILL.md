---
name: device-checklist
description: Produce the manual device test checklist (iPhone Safari + PWA, mid-range Android Chrome + PWA, desktop) scoped to what a change touched, so the owner can run it and record results. Use when a change affects drag, overlays, navigation, playback, reconnect, hints, rotation or motion, or when the user asks "what should I test on the phone".
---

# device-checklist

Source of truth: `docs/plans/2026-10-project-review/19-testing-strategy.md` §8 (M1–M18).
These checks cannot be automated; they are part of the definition of done for the areas
below. The agent cannot run them — it prepares the list and records the owner's results.

## 1. Scope the list

Pick the rows whose **Area** matches the change. Always include M14 and M18 for any UI change.

| #   | Area           | Check                                                                                                   |
| --- | -------------- | ------------------------------------------------------------------------------------------------------- |
| M1  | drag           | Slow hold on a card drags it; the timeline does not scroll                                              |
| M2  | drag           | Quick swipe on the timeline scrolls; no card is picked up                                               |
| M3  | drag           | Drag near the edge: auto-scroll works and the card stays under the finger                               |
| M4  | overlays       | Open settings from the game page: one smooth animation, no flicker                                      |
| M5  | overlays, back | Phone Back with settings open closes the panel and stays in the game                                    |
| M6  | overlays, back | Phone Back with the song editor open closes it; the playlist editor stays                               |
| M7  | layout         | Leaderboard chips: bottom border fully visible while scrolling the strip                                |
| M8  | playback       | Let a track finish during a placement, press play: it restarts                                          |
| M9  | playback       | Draw a previously heard track: it starts from the beginning                                             |
| M10 | network        | Wi-Fi off for 10 s mid-game, then on: play resumes, no error toast                                      |
| M11 | navigation     | Close the room, land on Home, press Start immediately: works                                            |
| M12 | identity       | Set a name, force-quit, reopen: the name is still there                                                 |
| M13 | spotify        | Connect Spotify, close the room, create a new one: no re-login (gated by decision 10; expected to fail) |
| M14 | layout         | Rotate the device on every screen: layout adapts, no stuck overlay                                      |
| M15 | layout         | Open the keyboard on the lobby name field: the field stays visible                                      |
| M16 | hints          | First-run hints appear once; reset in settings brings them back                                         |
| M17 | pwa            | Install as a PWA and repeat M4–M11                                                                      |
| M18 | motion         | OS reduced-motion on: every animation degrades, nothing breaks                                          |

## 2. Devices

One iPhone (Safari, plus installed PWA), one mid-range Android (Chrome, plus installed PWA),
one desktop browser. For LAN testing the dev server binds all interfaces on `5173` with a
self-signed certificate (`apps/web/vite.config.ts`); the Spotify callback constraint is
described in `docs/operations/deploy-self-hosted.md`.

## 3. Output format (paste into the report or the task thread)

```
Device checklist for: <change>            Build: <branch @ short sha>
| # | iPhone Safari | iPhone PWA | Android Chrome | Android PWA | Desktop | Note |
| M1 |  |  |  |  |  |  |
...
Legend: ✓ pass · ✗ fail (describe) · – not applicable
```

Rows the agent could not run stay empty; never fill a cell you did not observe.

## 4. After the owner reports

- A ✗ becomes a defect section in `20-bug-register.md` with the device, the step and the
  expected result (`/plan-status`). Attach the related finding id (B4, B2, B8, …) from the
  table in `19-testing-strategy.md` §8.
- All ✓ for the scoped rows closes the manual part of the definition of done; say so
  explicitly in the completion report together with the automated `/verify` result.
