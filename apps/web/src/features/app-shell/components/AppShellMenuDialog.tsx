import { m } from "framer-motion";
import { createPortal } from "react-dom";
import {
  MotionPresence,
  createAppShellMenuTransition,
  createFadeMotion,
  keepFadeOnMainThread,
  useReducedMotionPreference,
} from "../../motion";
import type { AppShellMenuProps } from "../AppShellMenu.types";
import { useAppShellMenuPreferencesState } from "../hooks/useAppShellMenuPreferencesState";
import { AppShellMenuSheet } from "./AppShellMenuSheet";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuDialogProps extends AppShellMenuProps {
  isOpen: boolean;
  onClose: (afterClose?: () => void) => void;
}

export function AppShellMenuDialog({
  footerAction,
  footerActions,
  isOpen,
  onClose,
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
  const menuLayer = typeof document !== "undefined" ? document.body : null;

  if (!menuLayer) {
    return null;
  }

  return createPortal(
    // `initial` matters here: the dialog is lazy, so this boundary mounts with the panel
    // already open and would otherwise skip the enter animation and snap into place.
    <MotionPresence initial>
      {isOpen ? (
        // The scrim is a sibling of the sheet, never its parent: nested opacities multiply,
        // so a fading scrim around a fading sheet leaves the panel see-through.
        <div className={styles.menuLayer} key="app-shell-menu">
          <m.div
            animate="animate"
            className={styles.menuScrim}
            exit="exit"
            initial="initial"
            onClick={() => onClose()}
            onUpdate={keepFadeOnMainThread}
            transition={createAppShellMenuTransition(reduceMotion)}
            variants={createFadeMotion(reduceMotion)}
          />
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
        </div>
      ) : null}
    </MotionPresence>,
    menuLayer,
  );
}
