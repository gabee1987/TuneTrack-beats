import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { useUiPreferencesStore } from "../features/preferences/uiPreferences";
import { ThemeDebugToggle } from "../features/theme/ThemeDebugToggle";
import { applyTheme } from "../features/theme/themeRegistry";
import { router } from "./router";

export function App() {
  const theme = useUiPreferencesStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      <RouterProvider router={router} />
      <ThemeDebugToggle />
    </>
  );
}
