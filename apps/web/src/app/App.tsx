import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { I18nProvider } from "../features/i18n";
import { useUiPreferencesStore } from "../features/preferences/uiPreferences";
import { applyTheme } from "../features/theme/themeRegistry";
import { AppToastProvider } from "../features/toast";
import { AppRouteFallback } from "./components/AppRouteFallback";
import { router } from "./router";

export function App() {
  const theme = useUiPreferencesStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <I18nProvider>
      <AppToastProvider>
        <RouterProvider fallbackElement={<AppRouteFallback />} router={router} />
      </AppToastProvider>
    </I18nProvider>
  );
}
