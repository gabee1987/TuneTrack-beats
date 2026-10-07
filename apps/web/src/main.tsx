import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppRouteFallback } from "./app/components/AppRouteFallback";
import { loadLazyRoute } from "./app/lazyRoute";
import "./app/styles/globals.css";
import { loadLanguageResource, resolveInitialLanguageId } from "./features/i18n/languages";
import { defaultUiPreferences, type ThemeId } from "./features/preferences/uiPreferences";
import { applyTheme } from "./features/theme/themeRegistry";
import { startAppHeightSync } from "./features/viewport/viewportStore";
import { readDeviceStorage } from "./services/storage/deviceStorage";

function getInitialTheme(): ThemeId {
  const persistedValue = readDeviceStorage("tunetrack-ui-preferences");

  if (!persistedValue) {
    return defaultUiPreferences.theme;
  }

  try {
    const parsedValue = JSON.parse(persistedValue) as {
      state?: {
        theme?: ThemeId;
      };
    };

    return parsedValue.state?.theme ?? defaultUiPreferences.theme;
  } catch {
    return defaultUiPreferences.theme;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

startAppHeightSync();
applyTheme(getInitialTheme());

const root = createRoot(rootElement);

// Only the active catalogue is downloaded (05 D3); the skeleton covers that request, so no
// translation key is ever painted. A stale chunk after a deploy reloads once, like a route.
root.render(<AppRouteFallback />);
void loadLazyRoute(() => loadLanguageResource(resolveInitialLanguageId())).then(() => {
  root.render(<App />);
});
