import type { ReactNode } from "react";
import type {
  MenuTabId,
  RevealedCardMode,
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

export interface AppShellMenuFooterAction {
  label: string;
  onClick: () => void;
  tone?: "danger" | "neutral";
}

export interface AppShellMenuProps {
  footerAction?: AppShellMenuFooterAction;
  footerActions?: AppShellMenuFooterAction[];
  title: string;
  subtitle: string;
  tabs: AppShellMenuTab[];
}

export interface AppShellMenuPreferencesState {
  lastOpenedMenuTab: MenuTabId;
  revealedCardMode: RevealedCardMode;
  setDevVisibility: UiPreferencesStore["setDevVisibility"];
  setLastOpenedMenuTab: (tabId: MenuTabId) => void;
  setRevealedCardMode: (mode: RevealedCardMode) => void;
  setTheme: (theme: ThemeId) => void;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  theme: ThemeId;
  updateViewPreferences: (nextView: Partial<ViewPreferences>) => void;
  view: UiPreferences["view"];
}
