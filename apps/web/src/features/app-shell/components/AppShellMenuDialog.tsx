import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { AppShellMenuProps } from "../AppShellMenu.types";
import { useAppShellMenuPreferencesState } from "../hooks/useAppShellMenuPreferencesState";
import { AppShellMenuSheet } from "./AppShellMenuSheet";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuDialogProps extends AppShellMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppShellMenuDialog({
  isOpen,
  onClose,
  subtitle,
  tabs,
  title,
}: AppShellMenuDialogProps) {
  const preferencesState = useAppShellMenuPreferencesState();
  const availableTabs = useMemo(() => tabs, [tabs]);
  const activeTabId = availableTabs.some(
    (tab) => tab.id === preferencesState.lastOpenedMenuTab,
  )
    ? preferencesState.lastOpenedMenuTab
    : availableTabs[0]?.id;
  const activeTab = availableTabs.find((tab) => tab.id === activeTabId) ?? null;
  const menuLayer = typeof document !== "undefined" ? document.body : null;
  const isMobileSheet =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 720px)").matches;

  if (!menuLayer) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className={styles.menuOverlay}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <AppShellMenuSheet
            activeTab={activeTab}
            activeTabId={activeTabId}
            isMobileSheet={isMobileSheet}
            onClose={onClose}
            preferencesState={preferencesState}
            subtitle={subtitle}
            tabs={availableTabs}
            title={title}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    menuLayer,
  );
}
