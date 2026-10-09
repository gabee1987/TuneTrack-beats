---
name: add-ui-component
description: Create or extend a React component in apps/web the TuneTrack way (reuse a primitive, CSS Module with tokens only, 48 px touch target, motion through features/motion, i18n keys, narrow props, component test, /dev/ui entry). Use for any new component, section, dialog, sheet or variant.
---

# add-ui-component

Rules: `CLAUDE.md` → Look & Feel, Frontend layer ownership, Animation;
`docs/rules/frontend_engineering_rules.md` §1–§3, §5–§8; `docs/rules/design_system.md` §2,
§4, §6, §8, §9.

## 1. Decide where it lives

| It is…                                         | Put it in                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| a generic control used by three or more places | `features/ui/primitives/<Name>.tsx` + export in `primitives/index.ts` |
| a composed pattern shared across pages         | `features/ui/<Name>.tsx`                                              |
| a section of one page used by both assemblies  | `pages/<Page>/components/<Name>.tsx`                                  |
| mobile-only or desktop-only                    | `pages/<Page>/mobile/` or `pages/<Page>/desktop/`                     |

Before writing anything, check `features/ui/primitives/index.ts`: `Avatar`, `Button`, `Card`,
`Chip`/`ChipButton`, `Dialog`, `EmptyState`, `IconButton`, `ListRow`/`ListRowButton`,
`SegmentedControl`, `Skeleton` already exist. A second button, icon button, dialog or sheet
shell is a defect (design_system §8 rule 1). Need a different look → add a **variant** to the
primitive, never a page-level override.

## 2. Component shape

- Props are narrow and explicit (see `features/ui/Badge.tsx`): no `PublicRoomState`, no store
  reads when the controller can pass a model. Booleans read like facts (`isActive`).
- Compose class names with `classNames(...)` from `features/ui/classNames.ts`.
- Text comes from `useI18n()` keys present in **both** `features/i18n/languages/en.properties`
  and `hu.properties`. No English literals, including aria labels.
- Interactive elements: `min-height`/`min-width` 48 px (`var(--size-touch-target)`), visible
  focus ring, no hover-only affordance. Haptics via `services/haptics/triggerPressHaptic`.
- Press feedback via CSS `:active` (`transform: scale(0.97)` + fill shift); no JS for it.

## 3. CSS Module (`<Name>.module.css` beside the component)

- Colours, surfaces, shadows, radii, spacing, z-index are tokens only:
  `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--z-*)`, `var(--type-*)`.
  A hex or rgba literal fails `src/test/guards/noHardcodedColors.test.ts`.
- Missing token → add it to `features/theme/darkThemeTokens.ts` **and**
  `lightThemeTokens.ts` (the type `SemanticColorTokens` forces parity), or a component token
  in `features/theme/tokens/components.ts`. Never a literal.
- Never spread-merge modules into a barrel (`noCssBarrels.test.ts`). One module per component,
  under 200 lines for a primitive, ~300 otherwise.
- Class names describe role (`.dismissButton`), not appearance (`.redBox`).

## 4. Motion

- Framer Motion only through `features/motion` helpers (`createFadeMotion`,
  `createDialogCardMotion`, `createBottomSheetMotion`, `MotionPresence`, …) or a dedicated
  animation component. A controller hook never imports `framer-motion`.
- Animate `transform` and `opacity` only; no `layout` animation on page containers or list
  rows on mobile. Reduced motion comes from `useReducedMotionPreference`, nowhere else.
- Backend-driven transitions get a coordinator hook with a named motion contract
  (pattern: `features/motion/transitions/previewCardReplaceTransition.ts`).

## 5. Dismissible overlays (dialog, sheet, editor)

- Build on `Dialog` or `BottomSheet`, or render an `Overlay` from `features/overlay` directly.
  The overlay owns the layer, the focus trap, the scroll guard, Escape, scrim taps and one
  same-path history entry, so Browser/Android Back closes only the topmost overlay. Never call
  `createPortal` yourself (`test/guards/overlaySites.test.ts`).
- A deeper step inside an open sheet (an editor opened from a list in the sheet) is a
  `PanelView`, never a second sheet on top (decision log 2026-10-08).
- Side sheets use `createSideSheetMotion`: an opaque panel, only the scrim fades.
- Blocking overlays pass `dismissible={false}` and ignore Escape and scrim taps; `onBack` is
  for the rare one whose Back runs its action (`RoomResetModal`).
- Layer with `--z-*` tokens only. Closing removes the portal; no hidden interactive DOM.

## 6. Test (required)

`<Name>.test.tsx` beside the component, rendered with `renderWithProviders` from
`src/test/renderWithProviders.tsx` (`layout: "mobile" | "desktop"`, `route`). Query by role and
accessible name; assert behaviour, not class names; no markup snapshots. Fixtures from
`src/test/roomStateFixtures.ts` (`buildTurnRoomState`, `TEST_ROOM_ID`). Fake timers for
anything timed.

## 7. Finish

- A new or changed primitive appears on `/dev/ui` (`pages/DesignSystemPage/DesignSystemPage.tsx`)
  in every variant and state.
- Run `/verify` for `@tunetrack/web`. If the component is a new file over the soft limit
  (~200 lines) split it before finishing.
