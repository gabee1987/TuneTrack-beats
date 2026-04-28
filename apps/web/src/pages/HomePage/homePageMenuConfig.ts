export interface HomePageMenuTabSpec {
  id: "language" | "settings" | "view";
  labelKey: "appShell.menu.languageTab" | "home.themeTab" | "home.viewTab";
  messageKey?: "home.themeMessage" | "home.viewMessage";
}

export function getHomePageMenuTabSpecs(): HomePageMenuTabSpec[] {
  return [
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
  ];
}
