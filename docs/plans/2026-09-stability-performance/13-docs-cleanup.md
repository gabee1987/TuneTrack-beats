# 13 — Documentation Cleanup

`docs/` currently holds 26 markdown files totalling roughly 10 400 lines. Most describe
work that has already shipped. The volume makes it hard for a new contributor — or an
agent — to tell which documents are still authoritative, and it makes it likely that
someone will follow a superseded plan.

This document classifies every file. **No file is deleted as part of this plan** without
the product owner's confirmation; the classification is the recommendation, and section 6
lists the specific questions.

## 1. Recommended structure

    docs/
      README.md                          ← NEW: index and reading order
      architecture/
        tunetrack_full_architecture.md
        tunetrack_technical_implementation_plan.md
      rules/
        backend_engineering_rules.md
        frontend_engineering_rules.md
      product/
        playlist_metadata_curation_plan.md   ← trimmed to its rules
      operations/
        axiom_logging_setup.md
        deploy-railway-frontend.md
        deploy-self-hosted.md
      decision_log.md
      plans/
        2026-09-stability-performance/       ← this programme
      archive/
        ... completed and superseded plans, unchanged ...

Rationale: an `archive/` folder preserves the history — which is genuinely valuable for
understanding why the code looks the way it does — while removing the ambiguity about what
is current. Everything in `archive/` gets a two-line header stating that it is historical
and what superseded it.

## 2. Keep — current and authoritative

| File | Lines | Why it stays | Action |
| --- | --- | --- | --- |
| `tunetrack_full_architecture.md` | 313 | The vision document. Every other plan defers to it. | Keep. Move to `architecture/`. |
| `tunetrack_technical_implementation_plan.md` | 580 | The engineering companion to the above. | Keep, but see section 5 on the overlap with `CLAUDE.md`. |
| `backend_engineering_rules.md` | 560 | The backend standard. Doc 04 changes the layer table, so it needs an update. | Keep; update after Doc 04 phase 4. |
| `frontend_engineering_rules.md` | 651 | The frontend standard. Docs 06, 07 and 10 add new rules to it. | Keep; update after Doc 06 phase 6 and Doc 07 phase 6. |
| `decision_log.md` | 308 | Living record. This programme adds at least seven entries. | Keep, actively. |
| `axiom_logging_setup.md` | 300 | Operational and current. Doc 04 adds `server_stopped`, Doc 08 adds playback diagnostics. | Keep; update as those land. |
| `deploy-railway-frontend.md` | 426 | The actual deployment path (Railway backend + Render static frontend), per the merge note in `ui_overhaul_design_system_spotify.md`. | Keep. Doc 08 phase 3 adds a required env var. |
| `deploy-self-hosted.md` | 670 | A genuine alternative, and the only document covering the HTTPS/Spotify-callback problem for LAN play. | Keep. |

## 3. Archive — completed, valuable as history

Move to `docs/archive/`, add a header, do not edit the body.

| File | Lines | Status | Note |
| --- | --- | --- | --- |
| `iteration_01_foundation_plan.md` | 535 | Marked **completed** | |
| `iteration_02_gameplay_loop_plan.md` | 626 | Marked **completed** | |
| `iteration_03_challenge_tokens_plan.md` | 576 | Marked **completed** | |
| `iteration_04_frontend_challenge_tt_plan.md` | 553 | Implemented (challenge/TT UI exists) — no status line | Add a status line before archiving |
| `iteration_05_main_menu_lobby_pwa_plan.md` | 652 | Implemented — no status line | Add a status line before archiving |
| `iteration_06_spotify_integration_plan.md` | 1253 | Implemented — no status line. Largest file in `docs/`. | Add a status line before archiving |
| `mobile_desktop_assembly_separation_plan.md` | 512 | Implemented; `ui_overhaul_design_system_spotify.md` calls it "already implemented and reused" | |
| `spotify_auto_music_setup_plan.md` | 566 | Sections marked **implemented** | |
| `spotify_smart_playlist_builder_plan.md` | 716 | Sections marked **implemented**, one partial ("implemented for playlist/track search and track append") | Note the partial in the header |

Subtotal: **5 989 lines** moved out of the active set.

## 4. Supersede — replaced by this programme

These describe work that this programme now owns. Archive them with an explicit pointer, so
anyone who finds them is redirected rather than misled.

| File | Lines | Superseded by | Important nuance |
| --- | --- | --- | --- |
| `refactor_performance_maintainability_plan.md` | 656 | Docs 02, 03, 04, 05 | Marked "Paused after Phase 7 — plan complete pending your manual validation". Its **Phase 8** (delta protocol) was never started; Doc 05 section 6 supersedes it with a simpler design (narrow named events plus a `revision` guard rather than JSON patch) and explains why. Its Phase 0-7 results tables are a useful record of what was measured in July. |
| `reconnect_and_host_transfer_plan.md` | 521 | Doc 04 sections 1-2, Doc 05 sections 1-3 | **Do not archive until Doc 04 has landed.** This plan was only *partially* implemented: `connectionStatus`, host transfer and turn-skip all exist, but the in-game eviction timer specified here was never wired up — that is finding F-12, the highest-severity defect in this audit. Archive it once Doc 04 phase 1 is verified, and record in the header which of its acceptance criteria are finally met. |
| `frontend_rework_sequence_plan.md` | 135 | Doc 00 section 4 | Pure sequencing for a phase that finished. Nothing in it is still actionable. **Strongest deletion candidate** rather than archive. |
| `gamepage_refactor_handoff.md` | 498 | Docs 03, 07 partially | Sections 1-3 and 7-9 are a historical checkpoint. **Section 4 ("What Still Needs Refactoring") is still live**: it names `useGamePageController`'s large flattened return object, the loose `TimelinePanelHeader`, unused testing seams, and repeated option interfaces. Extract section 4's still-valid items into an appendix of Doc 03 or a small follow-up plan **before** archiving, or they will be lost. See section 6 question 3. |
| `tunetrack_beats_mobile_ui_plan_brief.md` | 622 | `ui_overhaul_design_system_spotify.md`, then Doc 07 | The earlier mobile UI brief. `ui_overhaul_design_system_spotify.md` explicitly "refines the visual direction and formalizes the design-system layer", i.e. it replaced this. Some of the original design intent (personality, motion feel) may only exist here — worth a read-through before archiving to confirm nothing is lost. |

## 5. Consolidate

Two overlaps create genuine ambiguity about which document wins.

### 5.1 `ui_overhaul_design_system_spotify.md` (628 lines)

Status: "Phases 0-6 complete (mobile-first overhaul). Phase 7 (desktop visual pass) is
deferred." It also carries a merge checkpoint from 2026-07-24 describing a
`feature/ui-overhaul` branch that has since been merged (the git history shows the UI
overhaul commits on `main`).

- The **token architecture** and **design-system contract** sections are still the
  authoritative description of `features/theme` and should survive.
- The **phase plan** and **merge checkpoint** are spent.
- Doc 07 of this programme continues the same work (component consolidation, token
  adoption, the deferred desktop pass).

Recommendation: extract the still-authoritative design-system contract into
`rules/frontend_engineering_rules.md` (or a new `rules/design_system.md`), note the
deferred desktop pass as an entry in Doc 07, and archive the rest. Do this **after** Doc 07
phase 1 so the extraction reflects the consolidated component set rather than the current
fragmented one.

### 5.2 `tunetrack_technical_implementation_plan.md` (580 lines) versus `CLAUDE.md` (roughly 300 lines)

Both state the product rule lock, the architecture principles, the layer ownership and the
coding rules. `CLAUDE.md` is the file that is actually loaded into every agent session, so
it is the one that gets followed. Where they differ, nobody currently knows which wins.

Recommendation: keep `CLAUDE.md` as the single normative summary, and reduce
`tunetrack_technical_implementation_plan.md` to the material `CLAUDE.md` does **not** carry
— the longer-form rationale and the extension roadmap — with an explicit line at the top
saying `CLAUDE.md` is normative. Do not duplicate rules across both.

### 5.3 `deploy-render.md` (155 lines)

This document describes deploying the **backend** to a Render web service, then opens by
warning that Render's free web service spins down after 15 minutes and points the reader at
`deploy-railway-frontend.md` for "a backend alternative that stays alive". The project has
since moved to Railway for the backend and Render only for the static frontend — which
`deploy-railway-frontend.md` already covers in full.

Recommendation: **delete**. Its one unique contribution (the cold-start warning) is already
stated in the Railway document's comparison table. Keeping two deployment guides where one
is a known-bad option invites someone to follow it.

## 6. Questions for the product owner

These are the only judgement calls I will not make unilaterally, because they involve
discarding material.

1. **Delete or archive?** My recommendation is `docs/archive/` for everything in sections 3
   and 4, and outright deletion only for `deploy-render.md` and
   `frontend_rework_sequence_plan.md`. Deleting the rest would remove roughly 6 000 lines
   of context about why the code is shaped as it is. Do you want them archived in-repo, or
   removed entirely (they remain in git history either way)?
2. **`playlist_metadata_curation_plan.md` (228 lines).** It is not a plan so much as a
   product-rule statement: Spotify metadata is an import source, not game truth; hence
   `sourceReleaseYear`, `metadataStatus` and the curation flags. Doc 09 section 5 depends on
   those semantics. Should its rules be folded into `CLAUDE.md`'s game-rules section — where
   they would actually be read — and the file archived?
3. **`gamepage_refactor_handoff.md` section 4.** It lists real remaining frontend debt that
   this audit did not re-derive. Do you want that extracted into a small
   `plans/gamepage-remaining-refactors.md`, folded into Doc 03 as an appendix, or dropped as
   no longer a priority?
4. **Iteration plans 04, 05 and 06.** They have no status marker. I believe all three are
   implemented (the challenge/TT UI, the main menu and lobby, and the full Spotify
   integration all exist in the code). Can you confirm, so the archive headers are accurate?

## 7. Mechanical work, once the answers are in

1. Create `docs/README.md` as the index: what is normative, what is a live plan, what is
   archived, and the recommended reading order for a new contributor.
2. Create the subfolders in section 1 and move files. Use `git mv` so history follows.
3. Add a header to every archived file:

       > **Archived 2026-09-DD.** Historical record; implemented and shipped.
       > Superseded by: <path>. Do not follow this plan.

4. Fix the relative links that the moves break. `frontend_rework_sequence_plan.md`,
   `mobile_desktop_assembly_separation_plan.md` and `ui_overhaul_design_system_spotify.md`
   all cross-reference other docs by relative path.
5. Update the pointers in `CLAUDE.md`, `AGENT.md` and `README.md` if any of them reference a
   moved file.
6. Add a line to `decision_log.md` recording the reorganisation and its date.

## 8. Expected result

| | Before | After |
| --- | --- | --- |
| Files in the active set | 26 | **9** (8 keepers + `docs/README.md`) |
| Lines in the active set | roughly 10 400 | roughly **3 800** |
| Live plans | 1 paused, 1 partial, several ambiguous | **1** (this programme) |
| Documents whose authority is unclear | at least 5 | **0** |

The point is not to have fewer files. It is that a contributor opening `docs/` should be
able to tell, in ten seconds, which three documents they must obey and which one plan is
currently being executed.
