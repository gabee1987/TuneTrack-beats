import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_ID, buildHomePageNavigationTarget } from "./homePageNavigation";

describe("homePageNavigation", () => {
  it("exports stable defaults for the initial join form", () => {
    expect(DEFAULT_ROOM_ID).toBe("");
  });

  it("returns null when the room code is blank after trimming", () => {
    expect(
      buildHomePageNavigationTarget({
        roomId: "   ",
      }),
    ).toBeNull();
  });

  it("builds the encoded lobby path without putting player identity in the URL", () => {
    expect(
      buildHomePageNavigationTarget({
        roomId: " room / 42 ",
      }),
    ).toEqual({
      path: "/lobby/room%20%2F%2042",
    });
  });

  it("adds the create intent when creating a room", () => {
    expect(
      buildHomePageNavigationTarget({
        intent: "create",
        roomId: "host-room",
      }),
    ).toEqual({
      path: "/lobby/host-room?intent=create",
    });
  });
});
