import { describe, expect, it } from "vitest";
import {
  fromBeatWindowChoice,
  getBeatWindowChoices,
  NO_LIMIT_CHOICE,
  toBeatWindowChoice,
} from "./beatWindowChoices";

describe("Beat! window choices", () => {
  it("offers 5, 10, 15 and 30 seconds and no unlimited window", () => {
    expect(getBeatWindowChoices(10)).toEqual([5, 10, 15, 30]);
  });

  it("keeps a room's existing unlimited window visible, last", () => {
    expect(getBeatWindowChoices(null)).toEqual([5, 10, 15, 30, null]);
  });

  it("keeps a room's existing odd window visible, in order", () => {
    expect(getBeatWindowChoices(3)).toEqual([3, 5, 10, 15, 30]);
    expect(getBeatWindowChoices(20)).toEqual([5, 10, 15, 20, 30]);
  });

  it("maps seconds and the unlimited window to segmented-control values and back", () => {
    expect(toBeatWindowChoice(15)).toBe("15");
    expect(toBeatWindowChoice(null)).toBe(NO_LIMIT_CHOICE);
    expect(fromBeatWindowChoice("15")).toBe(15);
    expect(fromBeatWindowChoice(NO_LIMIT_CHOICE)).toBeNull();
  });
});
