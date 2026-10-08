import { describe, expect, it } from "vitest";
import {
  getOverlayLayer,
  getTopOverlayEntry,
  pushOverlayEntry,
  removeOverlayEntry,
  type OverlayStackEntry,
} from "./overlayStack";

const sheet: OverlayStackEntry = { dismissible: true, id: "sheet-1", kind: "sheet" };
const dialog: OverlayStackEntry = { dismissible: true, id: "dialog-1", kind: "dialog" };
const nestedSheet: OverlayStackEntry = { dismissible: true, id: "sheet-2", kind: "sheet" };

describe("overlayStack", () => {
  it("keeps open order and moves a re-opened entry to the top", () => {
    const stack = pushOverlayEntry(pushOverlayEntry(pushOverlayEntry([], sheet), dialog), sheet);

    expect(stack.map((entry) => entry.id)).toEqual(["dialog-1", "sheet-1"]);
    expect(getTopOverlayEntry(stack)).toBe(sheet);
  });

  it("removes only the named entry", () => {
    const stack = removeOverlayEntry([sheet, dialog, nestedSheet], "dialog-1");

    expect(stack).toEqual([sheet, nestedSheet]);
  });

  it("puts the first entry on its kind's layer and every later one on the nested layer", () => {
    const stack = [sheet, dialog, nestedSheet];

    expect(getOverlayLayer(stack, "sheet-1")).toBe("var(--z-sheet)");
    expect(getOverlayLayer(stack, "dialog-1")).toBe("var(--z-dialog-nested)");
    expect(getOverlayLayer(stack, "sheet-2")).toBe("var(--z-sheet-nested)");
    expect(getOverlayLayer([dialog], "dialog-1")).toBe("var(--z-dialog)");
  });

  it("has no layer for an entry that is not open", () => {
    expect(getOverlayLayer([sheet], "dialog-1")).toBeUndefined();
  });
});
