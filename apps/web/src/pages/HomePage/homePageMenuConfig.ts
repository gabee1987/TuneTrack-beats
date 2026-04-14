export interface HomePageMenuTabSpec {
  id: "settings" | "view";
  label: string;
  message: string;
}

export function getHomePageMenuTabSpecs(): HomePageMenuTabSpec[] {
  return [
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
  ];
}
