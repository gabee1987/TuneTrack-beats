import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_ROOM_ID,
  buildHomePageNavigationTarget,
} from "./homePageNavigation";

describe("homePageNavigation", () => {
  it("exports stable defaults for the initial join form", () => {
    expect(DEFAULT_ROOM_ID).toBe("party-room");
    expect(DEFAULT_DISPLAY_NAME).toBe("Player 1");
  });

  it("returns null when either input is blank after trimming", () => {
    expect(
      buildHomePageNavigationTarget({
        displayName: "   ",
        roomId: "party-room",
      }),
    ).toBeNull();

    expect(
      buildHomePageNavigationTarget({
        displayName: "Player 1",
        roomId: "   ",
      }),
    ).toBeNull();
  });

  it("builds the encoded lobby path from trimmed values", () => {
    expect(
      buildHomePageNavigationTarget({
        displayName: "  DJ Nova  ",
        roomId: " room / 42 ",
      }),
    ).toEqual({
      displayName: "DJ Nova",
      path: "/lobby/room%20%2F%2042?playerName=DJ%20Nova",
    });
  });
});
