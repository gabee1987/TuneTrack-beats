import { useUiPreferencesStore } from "../../preferences/uiPreferences";
import type { AppShellMenuPreferencesState } from "../AppShellMenu.types";

export function useAppShellMenuPreferencesState(): AppShellMenuPreferencesState {
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);
  const hiddenCardMode = useUiPreferencesStore((state) => state.hiddenCardMode);
  const setHiddenCardMode = useUiPreferencesStore(
    (state) => state.setHiddenCardMode,
  );
  const view = useUiPreferencesStore((state) => state.view);
  const updateViewPreferences = useUiPreferencesStore(
    (state) => state.updateViewPreferences,
  );
  const showDevCardInfo = useUiPreferencesStore(
    (state) => state.showDevCardInfo,
  );
  const showDevYearInfo = useUiPreferencesStore(
    (state) => state.showDevYearInfo,
  );
  const showDevAlbumInfo = useUiPreferencesStore(
    (state) => state.showDevAlbumInfo,
  );
  const showDevGenreInfo = useUiPreferencesStore(
    (state) => state.showDevGenreInfo,
  );
  const setDevVisibility = useUiPreferencesStore(
    (state) => state.setDevVisibility,
  );
  const lastOpenedMenuTab = useUiPreferencesStore(
    (state) => state.lastOpenedMenuTab,
  );
  const setLastOpenedMenuTab = useUiPreferencesStore(
    (state) => state.setLastOpenedMenuTab,
  );

  return {
    hiddenCardMode,
    lastOpenedMenuTab,
    setDevVisibility,
    setHiddenCardMode,
    setLastOpenedMenuTab,
    setTheme,
    showDevAlbumInfo,
    showDevCardInfo,
    showDevGenreInfo,
    showDevYearInfo,
    theme,
    updateViewPreferences,
    view,
  };
}
