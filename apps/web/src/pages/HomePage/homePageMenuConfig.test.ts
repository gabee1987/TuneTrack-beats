import { describe, expect, it } from "vitest";
import { getHomePageMenuTabSpecs } from "./homePageMenuConfig";

describe("homePageMenuConfig", () => {
  it("returns the stable top-bar menu tab configuration", () => {
    expect(getHomePageMenuTabSpecs()).toEqual([
      {
        id: "view",
        label: "View",
        message:
          "Gameplay visibility controls will appear here as the final mobile shell takes shape.",
      },
      {
        id: "settings",
        label: "Settings",
        message: "Theme and hidden-card preferences are ready for testing now.",
      },
    ]);
  });
});
