# 21 — Music Setup and Playlist Redesign

> **Status (2026-10-09):** Future work, not scheduled. Requested by the owner on 2026-10-09;
> phases 1–6 open. Four owner questions (§7) must be answered before Phase 2 starts.

> Owning layers: `apps/web/src/pages/LobbyPage` (Music Setup assembly, components and
> `hooks/spotify`), `apps/web/src/services/savedPlaylists`, `apps/web/src/features/ui`
> (shared selection and action primitives). No server or engine change is expected; Phase 5
> may need one `packages/shared` type change (§5).
> Related work this plan absorbs or must stay consistent with: `04-host-flow-ux-spec.md`
> (host flow, curation aids, glossary), `06` W5 (Lobby and Spotify setup file splits; "one
> track-details editor has three owners and three save paths"), `15-design-system-consolidation.md`
> (one button, one sheet), `14-navigation-and-overlays.md` (overlay host, Back behaviour).

## 1. Problem (owner feedback, 2026-10-09)

Music Setup is hard to use. The facts behind the owner's report:

- **Too many controls on one screen.** The URL tab shows eleven persistent controls (three
  source tabs, Close, Edit, Save, Clear, Import/Search, saved-playlist select, Rename, Delete)
  plus four conditional confirm rows. The opened-playlist panel adds three header actions,
  three actions per row, two floating actions and a seven-control details sheet.
- **Search results and saved playlists are mixed.** Searched, unsaved playlists and saved
  playlists share one screen and one queue; a saved playlist is chosen from a text-only
  dropdown (`AdaptiveSelect`).
- **Artwork is missing where it matters.** Covers appear in search results and the
  opened-playlist header only. The saved-playlist list, the deck editor header
  (`PlaylistEditModal`), the "tracks queued" summary and the candidate review header show
  none, and `savedPlaylists` stores no playlist cover.
- **Inconsistent selection actions.** Smart search, the opened playlist and the deck editor
  use solid add/remove buttons; candidate review (`SpotifyCandidateReviewPanel`,
  `spotifyBatchDeleteBtn`) falls back to the translucent `--color-status-danger-surface`
  and looks disabled, with its own position, radius and shadow literals.
- **The track editor looks foreign.** `PlaylistTrackDetailsSheet` uses
  `--color-surface-elevated-solid` while every sheet it opens over uses `--color-bg-app`;
  its primary button carries a `#1ed760` literal fallback.
- **Edits to a saved playlist are lost.** `usePlaylistEditor.updateTrack` updates only the
  room deck. A saved playlist is written only through Save → Overwrite
  (`useSavedPlaylistsController.confirmOverwrite`), so year and status corrections
  (`edited`, `verified`) are gone the next time the playlist is loaded.

## 2. Target experience

A guided flow modelled on the interaction patterns of Spotify's own client (large cover
header that collapses on scroll, one primary action per screen, list rows with a single
trailing action). Spotify serves as a pattern reference only; the app keeps its own visual
identity, tokens and copy, and no Spotify branding beyond the existing logo usage that the
Spotify developer terms permit.

Two separate homes, one flow:

1. **Library** — saved playlists as cover cards (cover, name, track count, "needs check"
   count). Opening one goes straight to Inspect.
2. **Find** — search (smart search, URL, quick picks) → results with covers → Inspect.

Wizard steps for a new playlist: **Find → Inspect → Edit → Save (optional) → Use in game.**
A saved playlist enters at Inspect. Each step has exactly one primary action at the bottom
(thumb zone); secondary actions live in an overflow menu.

## 3. Phases

### Phase 1 · Design specification (no code)

- Screen-by-screen spec for mobile and desktop assemblies: Library, Find, Inspect, Edit,
  Save, Use; states per screen (loading, success, error, empty, offline) as in `04` §4.
- Action inventory: every current control mapped to its new home (step, primary, overflow,
  or removed). Target: at most one primary and three visible secondary actions per screen.
- Collapsing header contract: full cover at the top of Inspect/Edit, cross-fading into a
  small cover in the sticky title bar as the list scrolls (`transform`/`opacity` only,
  shared motion helpers, reduced-motion fallback). Rich motion is kept (owner preference);
  durations follow `CLAUDE.md` → Look & Feel.
- Glossary and i18n key plan (`en`, `hu`) for the new step names and actions.
- **Proof:** spec reviewed by the owner; §7 questions answered.

### Phase 2 · Shared selection and action primitives (`features/ui`)

- One `SelectionActionBar` (count, primary, destructive) and one `ListRowAction` used by
  smart search, opened playlist, candidate review and the deck editor. Removes
  `spotifyBatchDeleteBtn`, `spotifySearchSelectedAction` and `batchToolbar` variants.
- Destructive and add styles come from tokens only; no `#dc2626`, `#fff` or `#1ed760`
  literals (`noHardcodedColors` allowlist shrinks).
- **Proof:** component tests for the primitives; a guard that no editor defines its own
  batch-toolbar class; the four editors render the same bar.

### Phase 3 · Library and Find split

- Library screen with cover cards replaces the saved-playlist dropdown, Rename and Delete
  move into each card's overflow menu.
- Find screen hosts smart search, URL import and quick picks; results show covers for
  playlists, albums and tracks, with a styled fallback when Spotify sends no image.
- Unsaved search results never appear in the Library; a saved playlist never appears as a
  search result unless searched for.
- **Proof:** component tests for both screens; E2E: open Library, open a saved playlist,
  return; search, open a result, return.

### Phase 4 · Inspect and Edit with collapsing cover header

- One playlist view for search results, saved playlists and the room deck (replaces
  `SpotifyOpenedPlaylistPanel`, `PlaylistEditModal` and the candidate review header).
- Collapsing cover header per Phase 1; virtualised list kept (`@tanstack/react-virtual`).
- One track editor (`PlaylistTrackDetailsSheet` successor) with the app's sheet surface
  tokens; one save path (resolves the `06` W5 item "three owners and three save paths").
- **Proof:** component tests for header collapse (scroll position → state), editor save
  path; `perf-check` trace of a 600-track scroll on a mid-range profile with no long task
  over 50 ms.

### Phase 5 · Saved playlists keep edits and covers

- Store the playlist cover URL (`imageUrl`) and a schema version in `SavedPlaylist`;
  migrate `tunetrack.savedPlaylists.v1` entries without loss.
- Track edits (title, artist, album, `releaseYear`, `metadataStatus`) made while a saved
  playlist is open are written back to that saved playlist (behaviour per §7 Q2), so the
  next load restores them.
- Room-deck edits of a deck that came from a saved playlist update the saved copy only
  when the host chooses so (or automatically, per §7 Q2); a deck from search stays unsaved
  until Save.
- **Proof:** `savedPlaylists` unit tests (migration, write-back, 20-playlist cap);
  component test: edit year → close → reopen shows the edit; E2E: edit, reload page,
  reopen playlist, edit persists.

### Phase 6 · Use in game and clean-up

- "Use in game" step replaces Replace/Append queue icons with one explicit choice
  (replace or append) and the deck-size indicator from `04` §3.
- Delete the superseded components and CSS modules (`spotifySetupShell`, `spotifyDiscovery`,
  `spotifyPanels`, `spotifySetupImport` — 1 616 lines today) once unused; the file-size and
  CSS soft limits hold for every new module.
- **Proof:** `verify` green; E2E host flow (`04` scenarios) green; no CSS module over 300
  lines in `pages/LobbyPage/components/spotify`.

## 4. Order and dependencies

Phase 1 first. Phase 2 can run in parallel with Phase 1 review. Phases 3–4 after 2 (they
consume the primitives). Phase 5 can run after Phase 1, independent of 3–4. Phase 6 last.
Do this plan **instead of** `06` W5 and the music-setup parts of `04`, not in addition:
when Phase 1 lands, mark the overlapping `04`/W5 items as owned here.

## 5. Contracts and layers

- UI assembly only (`pages/LobbyPage`), shared primitives in `features/ui`, persistence in
  `services/savedPlaylists`. Room-deck mutation stays server-side (`rooms/`); the client
  keeps using the existing playlist events.
- If the Library shows a cover for a deck loaded into the room, `loadCuratedPlaylist`
  may need an optional `imageUrl`; that is a `packages/shared` schema change and follows the
  `add-socket-action` checklist.

## 6. Compliance and data minimisation

- Saved playlists stay on the device (`localStorage`); nothing new is sent to the server.
- Storing the playlist cover URL adds one more third-party (Spotify CDN) URL to device
  storage. It contains no personal data but belongs in the storage review already required
  by `06` §10 and decision 10 before a client-facing deployment.
- Spotify remains a processor that needs compliance review before client-facing use; this
  plan adds no new Spotify API calls beyond those already made for search and playlist
  detail.
- Fixtures and screenshots use placeholder data (`Test Playlist`, `Test Artist`,
  `spotify:track:TEST…`).

## 7. Open owner questions (answer before Phase 2)

1. Are the wizard steps exactly Find → Inspect → Edit → Save → Use, or may Edit and Inspect
   be one screen with an edit mode?
2. Editing a saved playlist: write back automatically on every change, or on an explicit
   "Save changes" action?
3. Do quick picks stay a source inside Find, or become their own entry on the Library
   screen?
4. Desktop: the same step flow in a wider sheet, or a two-pane layout (list left, playlist
   right)?

## 8. Acceptance

- [ ] Library and Find are separate screens; saved and unsaved playlists never mix.
- [ ] Covers shown in search results, Library cards, Inspect/Edit headers and the Use step.
- [ ] Inspect/Edit header collapses from a large to a small cover on scroll, honouring
      reduced motion.
- [ ] One selection action bar and one track editor across every editor; no
      editor-specific batch styles or colour literals.
- [ ] Track edits in a saved playlist persist across reloads.
- [ ] At most one primary action per step; every screen has all five states defined.
