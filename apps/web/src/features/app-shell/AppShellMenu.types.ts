import type { ReactNode } from "react";
import type {
  HiddenCardMode,
  MenuTabId,
  ThemeId,
  UiPreferences,
  UiPreferencesStore,
  ViewPreferences,
} from "../preferences/uiPreferences";

export interface AppShellMenuTab {
  id: MenuTabId;
  label: string;
  content: ReactNode;
}

export interface AppShellMenuProps {
  footerAction?: {
    label: string;
    onClick: () => void;
    tone?: "danger" | "neutral";
  };
  title: string;
  subtitle: string;
  tabs: AppShellMenuTab[];
}

export interface AppShellMenuPreferencesState {
  hiddenCardMode: HiddenCardMode;
  lastOpenedMenuTab: MenuTabId;
  setDevVisibility: UiPreferencesStore["setDevVisibility"];
  setHiddenCardMode: (mode: HiddenCardMode) => void;
  setLastOpenedMenuTab: (tabId: MenuTabId) => void;
  setTheme: (theme: ThemeId) => void;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  theme: ThemeId;
  updateViewPreferences: (nextView: Partial<ViewPreferences>) => void;
  view: UiPreferences["view"];
}
