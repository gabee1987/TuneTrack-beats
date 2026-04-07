import { useUiPreferencesStore } from "../preferences/uiPreferences";

export function ThemeDebugToggle() {
  const theme = useUiPreferencesStore((state) => state.theme);
  const toggleTheme = useUiPreferencesStore((state) => state.toggleTheme);

  return (
    <button
      aria-label="Toggle theme"
      className="theme-debug-toggle"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
