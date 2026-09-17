import { describe, expect, it } from "vitest";
import { buildHomePageNavigationTarget } from "./homePageNavigation";

describe("homePageNavigation", () => {
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

  it("carries custom-code creation intent in route state instead of the URL", () => {
    expect(
      buildHomePageNavigationTarget({
        intent: "create",
        roomId: "host-room",
      }),
    ).toEqual({
      path: "/lobby/host-room",
      state: { intent: "create" },
    });
  });

  it("opens the code-less lobby route for server-generated creation", () => {
    expect(
      buildHomePageNavigationTarget({
        intent: "create",
      }),
    ).toEqual({
      path: "/lobby",
      state: { intent: "create" },
    });
  });
});
