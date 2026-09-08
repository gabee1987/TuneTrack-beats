import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles/globals.css";
import { defaultUiPreferences, type ThemeId } from "./features/preferences/uiPreferences";
import { applyTheme } from "./features/theme/themeRegistry";

function syncAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

function getInitialTheme(): ThemeId {
  const persistedValue = window.localStorage.getItem("tunetrack-ui-preferences");

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

syncAppHeight();
applyTheme(getInitialTheme());
window.addEventListener("resize", syncAppHeight);

createRoot(rootElement).render(<App />);
