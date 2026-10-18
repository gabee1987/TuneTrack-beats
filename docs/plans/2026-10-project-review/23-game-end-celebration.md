# 23 — Game End Celebration: Experience Specification

> **Status (2026-10-18):** Requested by the owner on 2026-10-18; not started. Open questions in
> §9 must be answered before W1. Starts after `22` S12. This document owns everything a player
> sees once a game reaches `finished`: the celebration, the results, the game summary and what
> comes next.

## 1. Why

When a game finishes, every player sees `FinishedStatePanel`
(`apps/web/src/pages/GamePage/components/FinishedStatePanel.tsx`): one line, "You won the game!"
or "{{playerName}} won the game!", inside the action dock. The game ends at its high point, and
the screen does not mark it. The owner asked for "a full screen, animated celebration screen with
detail, leaderboard, info about the game: a full-fledged, engaging, joyful celebration for all
players".

## 2. Goals

- **A moment for everyone.** The winner gets the spotlight, and every other player still gets a
  reason to smile: their placing, their best moment, their own numbers.
- **Full screen, on every device at once.** The celebration replaces the game screen for all
  players when the server reports `finished`; nobody has to look at another phone.
- **Motion that tells the story** (`CLAUDE.md` → Motion; decision 19 allows celebrations to run
  longer). It must not decorate without purpose.
- **Clear next steps.** After the celebration a player can see the full results and choose what
  to do next without hunting for it.

## 3. Experience outline (to be detailed in W1)

1. **Reveal (about 2–3 s).** The screen takes over with the winner's name and avatar initial,
   a large animated count of their cards, and a burst of colour in the theme's accent tokens.
   On the winner's own device, "You won!" is the hero line.
2. **Podium and leaderboard.** The top three on a podium, then every player ranked by timeline
   cards, with ties ordered by who reached the count first (the deck-exhaustion rule in
   `CLAUDE.md` → Game Rules). Each row shows cards, tokens left and the player's offline state
   if they dropped.
3. **Game summary.** Facts about the game. Candidates (W1 decides which ones):
   - songs played and the share placed correctly
   - turns played
   - game length
   - successful and failed Beat! challenges
   - the oldest and the newest song placed
   - the closest correct placement
   - the deck used (practice or the playlist's name)
4. **Highlights per player.** One short badge each, for example "Beat! master" (most
   successful challenges), "Time traveller" (oldest song placed) or "Steady hand" (longest run
   of correct placements). Each badge must come from data the client already has.
5. **Each player's timeline**, opened from their leaderboard row: the cards they ended with, in
   year order, with covers.
6. **What next.** Actions for the host and for guests (§9 Q1), plus a way to leave.

## 4. Data and contracts

Most facts can be derived on the client from `PublicRoomState`:

- `players`
- `timelines`
- `history`, which lists each placement with its correctness, Beat! outcome and the player
  who was awarded the card
- `settings`
- `winnerPlayerId`

Gaps that need a server change in `packages/shared` (server authority; schema, mapping and tests
on both sides):

| Missing fact       | Why it is needed                           | Proposed source                                       |
| ------------------ | ------------------------------------------ | ----------------------------------------------------- |
| Finish reason      | "Reached 10 cards" vs "the deck ran out"   | `finishReason: "target" \| "deck_exhausted"` on state |
| Game start and end | Game length                                | `startedAtEpochMs`, `finishedAtEpochMs`               |
| Ranking tiebreak   | Who reached the count first, on a tie      | Ranking computed by the engine, published as a list   |
| Tokens spent       | A "big spender" style highlight, if wanted | Derived from history if extended; otherwise dropped   |

The ranking stays in `packages/game-engine`; the client never recomputes a rule the server owns.
Statistics that are pure presentation (counts, oldest song) are pure selectors in the page's
`hooks/` with unit tests.

## 5. Design and motion rules

- **Assemblies:** a mobile assembly and a desktop assembly that share one model hook (`CLAUDE.md`
  → Look & Feel).
  - On phones the sections stack and scroll.
  - On desktop the podium and leaderboard can sit beside the summary.
- **Tokens only:** theme tokens for every colour, surface and shadow. The celebration colours
  come from the accent tokens so a future theme changes them without component edits.
- **Motion:**
  - Contracts are named in `features/motion`, for example `createCelebrationRevealMotion` and
    `createPodiumRiseMotion`.
  - Animate `transform` and `opacity` only.
  - Particles, if any, are a small fixed count driven by CSS or one canvas, and stop when the
    reveal ends. Nothing loops while the results are on screen except one subtle accent the owner
    approves (decision 19).
  - Reduced motion shows the same content at once, with no particles.
- **Performance** (`05` §2):
  - The celebration code loads lazily, prefetched during the last turn or when `finished`
    arrives, so the eager path does not grow.
  - No layout animation on page containers.
  - The reveal holds 60 fps on a mid-range phone (`perf-check` protocol).
- **Sound:** none by default. Any celebration sound is an owner decision (§9 Q4) and respects the
  host-device audio rule.
- **Accessibility:**
  - Moving the screen to the results is announced once.
  - The leaderboard is a list with ranks in the accessible names.
  - Every action is at least 48 × 48 px.
  - Escape and Back follow the overlay rules (`22` §12) if the celebration is an overlay.
- **No new third-party dependency** (no confetti library or animation service) without a
  compliance and bundle review; the motion helpers and Framer Motion cover this.
- **Every new component goes on `/dev/ui`**, in each state: winner view, other-player view, a
  tie, the deck running out, reduced motion and a player who is offline.

## 6. Work packages (proposed)

| WP  | Content                                                                                                                                                                          | Proof                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| W0  | Owner answers §9; final choice of summary facts and highlights.                                                                                                                  | Decision-log entry                                                                                                       |
| W1  | Contracts: finish reason, start/end times, engine ranking in public state.                                                                                                       | Engine tests (ranking, ties, deck exhausted); server mapping and realtime tests; shared schema tests                     |
| W2  | Results model: pure selectors for ranking display, summary facts and highlights.                                                                                                 | Unit tests per selector, including ties, one-player games and a game ended by the deck                                   |
| W3  | Celebration screen, phone assembly: reveal, podium, leaderboard, summary, highlights, timeline view, actions; motion contracts; `/dev/ui` states. Replaces `FinishedStatePanel`. | Component tests with `roomStateFixtures` (winner, other player, tie, deck ran out, reduced motion); `motionBudget` entry |
| W4  | Desktop assembly and the post-game actions (§9 Q1).                                                                                                                              | Component tests; E2E `gameplay.spec.ts` "both players see the winner" extended to the results                            |
| W5  | Clean-up and acceptance: delete `FinishedStatePanel` and its keys, `perf-check`, `device-checklist` (M14, M18).                                                                  | `verify` green; `npm run e2e` green; §7 boxes ticked                                                                     |

## 7. Acceptance criteria

- [ ] Every player's device shows the full-screen celebration within one state update of
      `finished`; the winner's device names them "You".
- [ ] The leaderboard order matches the engine's ranking, ties included (engine and component
      tests).
- [ ] Every summary fact and highlight comes from a tested selector or a server field; none is
      guessed.
- [ ] Reduced motion shows the same content with no movement beyond fades.
- [ ] The eager path does not grow; the celebration chunk loads lazily.
- [ ] Phone and desktop assemblies both render every `/dev/ui` state.
- [ ] `FinishedStatePanel` and its now-unused keys are deleted (one way per screen).

## 8. Out of scope

- Persistent statistics across games or accounts (there is no storage beyond the room; any
  later history feature needs its own GDPR data-minimisation review).
- Sharing results to social networks or any external service.

## 9. Open questions for the owner

1. **What comes next:**
   - Should the host get "Play again with the same players" (back to the lobby with the same
     room, rules and deck)? This needs a server reset of the finished room.
   - Or is "Back to Home" for everyone enough for now?
   - What do guests see while the host decides?
2. **How long the celebration lasts:**
   - Does the reveal play once and then settle on the results?
   - Or does each player tap "See results"?
   - May a player skip it?
3. **Which summary facts and highlights matter most** (§3 items 3 and 4)? Is a badge for every
   player wanted, even a light-hearted one for last place?
4. **Sound** on the host device for the reveal: yes or no?
5. **Should the timeline view** (§3 item 5) be part of the first release or a follow-up?
