import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { useUiPreferencesStore } from "../features/preferences/uiPreferences";
import { applyTheme } from "../features/theme/themeRegistry";
import { AppRouteFallback } from "./components/AppRouteFallback";
import { router } from "./router";

export function App() {
  const theme = useUiPreferencesStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      <RouterProvider fallbackElement={<AppRouteFallback />} router={router} />
    </>
  );
}
