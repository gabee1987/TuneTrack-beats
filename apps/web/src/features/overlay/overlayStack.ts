export type OverlayKind = "blocking" | "dialog" | "sheet";

/** A `view` is a step inside an open panel (`PanelView`): it stacks for Escape, focus and Back but takes no layer. */
export type OverlayStackKind = OverlayKind | "view";

export interface OverlayStackEntry {
  dismissible: boolean;
  id: string;
  kind: OverlayStackKind;
}

const BASE_LAYER: Record<OverlayKind, string> = {
  blocking: "var(--z-blocking)",
  dialog: "var(--z-dialog)",
  sheet: "var(--z-sheet)",
};

const NESTED_LAYER: Record<OverlayKind, string> = {
  blocking: "var(--z-blocking)",
  dialog: "var(--z-dialog-nested)",
  sheet: "var(--z-sheet-nested)",
};

/**
 * A blocking entry paints above every other layer, so it also stays on top of the stack:
 * Escape and the focus trap must never reach a dialog hidden underneath it.
 */
export function pushOverlayEntry(
  stack: readonly OverlayStackEntry[],
  entry: OverlayStackEntry,
): OverlayStackEntry[] {
  const rest = stack.filter((current) => current.id !== entry.id);

  if (entry.kind === "blocking") {
    return [...rest, entry];
  }

  const firstBlocking = rest.findIndex((current) => current.kind === "blocking");
  return firstBlocking === -1
    ? [...rest, entry]
    : [...rest.slice(0, firstBlocking), entry, ...rest.slice(firstBlocking)];
}

export function removeOverlayEntry(
  stack: readonly OverlayStackEntry[],
  id: string,
): OverlayStackEntry[] {
  return stack.filter((entry) => entry.id !== id);
}

export function getTopOverlayEntry(
  stack: readonly OverlayStackEntry[],
): OverlayStackEntry | undefined {
  return stack[stack.length - 1];
}

/**
 * An entry opened above another overlay takes its kind's nested layer, so a dialog over a
 * sheet, or a sheet over a sheet, can never land underneath its parent (B1).
 */
export function getOverlayLayer(
  stack: readonly OverlayStackEntry[],
  id: string,
): string | undefined {
  const index = stack.findIndex((entry) => entry.id === id);
  const entry = stack[index];

  if (!entry || entry.kind === "view") {
    return undefined;
  }

  return index === 0 ? BASE_LAYER[entry.kind] : NESTED_LAYER[entry.kind];
}

/** Whether every entry above `id` is a view inside it, so a tap on its scrim belongs to the top view. */
export function isTopWithinOverlay(stack: readonly OverlayStackEntry[], id: string): boolean {
  const index = stack.findIndex((entry) => entry.id === id);
  return index !== -1 && stack.slice(index + 1).every((entry) => entry.kind === "view");
}
