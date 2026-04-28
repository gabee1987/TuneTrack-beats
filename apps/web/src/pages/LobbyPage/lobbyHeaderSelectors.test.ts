import { describe, expect, it } from "vitest";
import { getLobbyConnectionBadgeVariant, getLobbyHeaderMenuTabSpecs } from "./lobbyHeaderSelectors";

describe("lobbyHeaderSelectors", () => {
  it("maps connected status to the connected badge variant", () => {
    expect(getLobbyConnectionBadgeVariant("Connected")).toBe("connected");
    expect(getLobbyConnectionBadgeVariant("Reconnecting")).toBe("mutedSurface");
  });

  it("returns the non-host lobby menu tabs", () => {
    expect(getLobbyHeaderMenuTabSpecs(false).map((tab) => tab.id)).toEqual([
      "players",
      "view",
      "settings",
      "language",
    ]);
  });

  it("adds only the diagnostics host tab for hosts", () => {
    expect(getLobbyHeaderMenuTabSpecs(true).map((tab) => tab.id)).toEqual([
      "players",
      "view",
      "settings",
      "language",
      "dev",
    ]);
  });
});
