import type { NameSheetProps } from "../../features/profile/NameSheet";

export interface HomePageIdentity {
  displayName: string;
  onChange: () => void;
}

export interface HomePageController {
  handleHost: () => void;
  handleJoin: () => void;
  /** Why Host is disabled, shown under it; `null` while hosting is possible. */
  hostDisabledReason: string | null;
  /** The "Playing as" chip; absent until this device has a name. */
  identity: HomePageIdentity | null;
  isHosting: boolean;
  nameSheetProps: NameSheetProps;
  preloadLobby: () => void;
  toastMessage: string | null;
}

export interface HomePageAssemblyProps {
  controller: HomePageController;
}
