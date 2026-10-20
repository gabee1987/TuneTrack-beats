import {
  createSideSheetMotion,
  createSideSheetScrimMotion,
  useReducedMotionPreference,
} from "../../motion";
import { Overlay } from "../../overlay";
import type { AppShellMenuProps } from "../AppShellMenu.types";
import { useAppShellMenuPreferencesState } from "../hooks/useAppShellMenuPreferencesState";
import { AppShellMenuSheet } from "./AppShellMenuSheet";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuDialogProps extends AppShellMenuProps {
  isOpen: boolean;
  onClose: (afterClose?: () => void) => void;
  onClosed?: () => void;
}

export function AppShellMenuDialog({
  footerAction,
  footerActions,
  isOpen,
  onClose,
  onClosed,
  subtitle,
  tabs,
  title,
}: AppShellMenuDialogProps) {
  const reduceMotion = useReducedMotionPreference();
  const preferencesState = useAppShellMenuPreferencesState();
  const activeTabId = tabs.some((tab) => tab.id === preferencesState.lastOpenedMenuTab)
    ? preferencesState.lastOpenedMenuTab
    : tabs[0]?.id;
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  return (
    <Overlay
      isOpen={isOpen}
      kind="sheet"
      label={title}
      layerClassName={styles.menuLayer}
      onDismiss={() => onClose()}
      panelClassName={styles.menuSheet}
      panelMotion={createSideSheetMotion(reduceMotion)}
      scrimClassName={styles.menuScrim}
      scrimMotion={createSideSheetScrimMotion(reduceMotion)}
      {...(onClosed ? { onClosed } : {})}
    >
      <AppShellMenuSheet
        activeTab={activeTab}
        activeTabId={activeTabId}
        onClose={onClose}
        preferencesState={preferencesState}
        subtitle={subtitle}
        tabs={tabs}
        title={title}
        {...(footerAction ? { footerAction } : {})}
        {...(footerActions ? { footerActions } : {})}
      />
    </Overlay>
  );
}
