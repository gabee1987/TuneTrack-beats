import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "dark" | "light";
export type HiddenCardMode = "artwork" | "gradient";
export type MenuTabId = "players" | "view" | "settings" | "host" | "dev";

export interface ViewPreferences {
  showMiniStandings: boolean;
  showHelperLabels: boolean;
  showTimelineHints: boolean;
  showRoomCodeChip: boolean;
  showPhaseChip: boolean;
  showTurnNumberChip: boolean;
}

export interface UiPreferences {
  theme: ThemeId;
  hiddenCardMode: HiddenCardMode;
  view: ViewPreferences;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevAlbumInfo: boolean;
  showDevGenreInfo: boolean;
  lastOpenedMenuTab: MenuTabId;
}

export interface UiPreferencesStore extends UiPreferences {
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  setHiddenCardMode: (mode: HiddenCardMode) => void;
  setLastOpenedMenuTab: (tabId: MenuTabId) => void;
  updateViewPreferences: (nextView: Partial<ViewPreferences>) => void;
  setDevVisibility: (settings: {
    showDevCardInfo?: boolean;
    showDevYearInfo?: boolean;
    showDevAlbumInfo?: boolean;
    showDevGenreInfo?: boolean;
  }) => void;
}

export const defaultUiPreferences: UiPreferences = {
  theme: "dark",
  hiddenCardMode: "artwork",
  view: {
    showMiniStandings: false,
    showHelperLabels: true,
    showTimelineHints: false,
    showRoomCodeChip: false,
    showPhaseChip: false,
    showTurnNumberChip: true,
  },
  showDevCardInfo: false,
  showDevYearInfo: false,
  showDevAlbumInfo: false,
  showDevGenreInfo: false,
  lastOpenedMenuTab: "players",
};

export const useUiPreferencesStore = create<UiPreferencesStore>()(
  persist(
    (set) => ({
      ...defaultUiPreferences,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
      setHiddenCardMode: (hiddenCardMode) => set({ hiddenCardMode }),
      setLastOpenedMenuTab: (lastOpenedMenuTab) => set({ lastOpenedMenuTab }),
      updateViewPreferences: (nextView) =>
        set((state) => ({
          view: {
            ...state.view,
            ...nextView,
          },
        })),
      setDevVisibility: (settings) =>
        set((state) => ({
          showDevCardInfo:
            settings.showDevCardInfo ?? state.showDevCardInfo,
          showDevYearInfo:
            settings.showDevYearInfo ?? state.showDevYearInfo,
          showDevAlbumInfo:
            settings.showDevAlbumInfo ?? state.showDevAlbumInfo,
          showDevGenreInfo:
            settings.showDevGenreInfo ?? state.showDevGenreInfo,
        })),
    }),
    {
      name: "tunetrack-ui-preferences",
      partialize: (state) => ({
        theme: state.theme,
        hiddenCardMode: state.hiddenCardMode,
        view: state.view,
        showDevCardInfo: state.showDevCardInfo,
        showDevYearInfo: state.showDevYearInfo,
        showDevAlbumInfo: state.showDevAlbumInfo,
        showDevGenreInfo: state.showDevGenreInfo,
        lastOpenedMenuTab: state.lastOpenedMenuTab,
      }),
    },
  ),
);
