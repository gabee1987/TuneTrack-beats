import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles/globals.css";
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

createRoot(rootElement).render(<App />);
