import { describe, expect, it } from "vitest";
import { getHomePageMenuTabSpecs } from "./homePageMenuConfig";

describe("homePageMenuConfig", () => {
  it("returns the stable top-bar menu tab configuration", () => {
    expect(getHomePageMenuTabSpecs()).toEqual([
      {
        id: "view",
        labelKey: "home.viewTab",
        messageKey: "home.viewMessage",
      },
      {
        id: "settings",
        labelKey: "home.themeTab",
        messageKey: "home.themeMessage",
      },
      {
        id: "language",
        labelKey: "appShell.menu.languageTab",
      },
    ]);
  });
});
