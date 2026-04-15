# TuneTrack Frontend Rework Sequence Plan

## Purpose

This document captures the agreed frontend execution order for the next major architecture phase of TuneTrack.

It is intentionally short and sequencing-focused.
Detailed implementation planning for each phase should live in its own companion document.

This plan follows and must remain compatible with:

- [tunetrack_full_architecture.md](./tunetrack_full_architecture.md)
- [tunetrack_technical_implementation_plan.md](./tunetrack_technical_implementation_plan.md)
- [backend_engineering_rules.md](./backend_engineering_rules.md)
- [tunetrack_beats_mobile_ui_plan_brief.md](./tunetrack_beats_mobile_ui_plan_brief.md)

---

## Agreed Execution Order

The agreed implementation order is:

1. mobile/desktop assembly separation
2. render/performance and prop-contract cleanup
3. Spotify/domain-data integration
4. replace JSON test cards with real generated song cards

This order is intentional.

---

## Why This Order Is Correct

### 1. Mobile/Desktop Assembly Separation First

The current app still mixes layout responsibilities inside shared page trees.
Even after the refactors already completed, the page roots are still too close to a unified responsive model.

This means:

- UI complexity is still paid inside shared trees
- layout responsibilities are not fully explicit
- future mobile and desktop divergence would otherwise continue to accumulate inside the same components

This phase creates the structural foundation for everything that follows.

### 2. Performance And Prop-Contract Cleanup Second

Once mobile and desktop assemblies are split cleanly, we can optimize:

- what gets rendered
- what gets loaded
- how view-model data is passed
- how page trees are shaped

Doing this before UI separation would optimize a structure we already intend to replace.

### 3. Spotify And Domain-Data Integration Third

Spotify integration introduces new complexity:

- auth and tokens
- playlist import
- track normalization
- remote API concerns
- data caching and failure modes
- playback and metadata boundaries

That complexity should land on top of a stable UI and rendering architecture, not inside a layout system that is still being reworked.

### 4. Replace JSON Cards Last

The JSON test-card source should be removed only after:

- the UI structure is stable
- performance boundaries are clearer
- the Spotify/domain data flow is defined

This ensures the replacement happens once and flows through the final domain pipeline instead of through temporary adapters.

---

## Phase Intent Summary

### Phase 1

Create explicit mobile and desktop page assemblies while keeping controllers, rules, and shared primitives single-source.

Detailed plan:

- [mobile_desktop_assembly_separation_plan.md](./mobile_desktop_assembly_separation_plan.md)

### Phase 2

Reduce render cost, reduce prop fan-out, create page-scoped assembly models, and improve lazy loading and tree boundaries.

### Phase 3

Introduce Spotify as a domain and service integration, not as a UI hack.

### Phase 4

Replace the current JSON-card test source with real generated song cards backed by the new domain-data pipeline.

---

## Guardrails For All Phases

These rules remain active across the full rework sequence:

- server-authoritative gameplay remains unchanged
- game rules remain outside React
- page roots must stay orchestration and assembly focused
- shared UI primitives live below page assemblies
- feature and page logic should not be moved into global state without a real cross-tree need
- performance changes must be evidence-driven
- each phase should keep `typecheck`, `lint`, `test`, and `build` green

---

## Deliverable Rule

Each phase should produce:

- updated markdown plan documentation
- incremental code changes
- passing verification
- a clear stop point before moving to the next phase

---

## Current Status

Phase 1 is the current active planning target.

