import { useUiPreferencesStore } from "../../preferences/uiPreferences";
import type { AppShellMenuPreferencesState } from "../AppShellMenu.types";

export function useAppShellMenuPreferencesState(): AppShellMenuPreferencesState {
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);
  const revealedCardMode = useUiPreferencesStore((state) => state.revealedCardMode);
  const setRevealedCardMode = useUiPreferencesStore(
    (state) => state.setRevealedCardMode,
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
    lastOpenedMenuTab,
    revealedCardMode,
    setDevVisibility,
    setLastOpenedMenuTab,
    setRevealedCardMode,
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
