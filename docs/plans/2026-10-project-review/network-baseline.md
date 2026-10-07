# Network baseline

Measured with `npm exec -w @tunetrack/server -- vitest run tests/rooms/stateUpdateSize.test.ts`
(the test prints the sizes). Gate: `05-performance-and-robustness-plan.md` A10, applied to the
compressed size on the wire (decision 20). Every package that changes the payload appends one
row; rows are never edited.

Fixture: 6 players, 30 timeline cards each with artwork, preview URL and Spotify URI at real
lengths (placeholder hosts, pseudo-random IDs), 30 history entries, a current track card. This
is the largest state a 30-card game reaches.

| Date       | After package | `state_update` raw (bytes) | of which `history` | Deflated (bytes) | Compression on the wire |
| ---------- | ------------- | -------------------------- | ------------------ | ---------------- | ----------------------- |
| 2026-10-07 | A10           | 117,071                    | 22,616             | 13,022           | on above 4 kB           |

Before A10 the server sent the raw size: per-message compression was off. A 10-card game at
6 players carries about a third of the timeline data.
