# TuneTrack — Decision Log

This file records concrete implementation decisions and open questions so they
do not stay hidden in code.

---

## Decided

### Equal release-year placement

If a candidate track has the same release year as one or more adjacent timeline
cards, every slot inside that same-year block counts as a correct placement.

Example:
- Timeline years: `1988, 1990, 1990, 1990, 1994`
- Candidate year: `1990`
- Valid slot indexes: `1, 2, 3, 4`

### Target timeline size

The number of cards needed to win is configurable per room instead of being
hardcoded to 10.

Current limits:
- Minimum: `3`
- Default: `10`
- Maximum: `30`

Only the host can change this setting in the lobby.

### Host disconnect behavior

If the host disconnects during the current lobby skeleton, host role is assigned
to the first remaining player in the room.

If the last player leaves, the in-memory room is removed.

### MVP room storage

Rooms are stored in memory only for the current foundation iteration.

---

## Still Open

### Reconnect/session identity strategy

Current behavior treats a reconnect as a fresh socket/player join.

Still to decide:
- Should we support reconnecting into the same player identity after refresh?
- If yes, should identity be restored from a short-lived token in local storage?

### Room code generation rules

Current implementation lets the player type any valid room code and creates the
room if it does not exist.

Still to decide:
- Should host-created rooms generate a short random code automatically?
- Should room codes be uppercase-only for easier party sharing?

### Duplicate player names

Current implementation allows duplicate display names.

Still to decide:
- Should duplicate names be blocked within one room?
- Or should we keep allowing them and rely on internal player IDs only?

### Deck source for MVP gameplay

Still to decide:
- Should Iteration 02 use a static hand-curated JSON deck first?
- Or should we start with a Spotify playlist import pipeline immediately?

Recommendation:
- Use a static seed deck first so we can finish the game loop before external
  playback/provider complexity.

### Challenge timing authority

Still to decide:
- What is the exact server-authoritative timing model for the challenge window?
- Should late client challenge clicks be rejected based on server timestamps only?

Recommendation:
- Yes, resolve challenge timing with server-side timestamps only.

---

# End of Decision Log
