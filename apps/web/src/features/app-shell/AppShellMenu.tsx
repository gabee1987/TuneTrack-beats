import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppShellMenuSheet } from "./components/AppShellMenuSheet";
import { useAppShellMenuPreferencesState } from "./hooks/useAppShellMenuPreferencesState";
import type { AppShellMenuProps } from "./AppShellMenu.types";
import styles from "./AppShellMenu.module.css";

export function AppShellMenu({ title, subtitle, tabs }: AppShellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      <button
        className={styles.menuTrigger}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Menu
      </button>

      {menuLayer
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  animate={{ opacity: 1 }}
                  className={styles.menuOverlay}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                >
                  <AppShellMenuSheet
                    activeTab={activeTab}
                    activeTabId={activeTabId}
                    isMobileSheet={isMobileSheet}
                    onClose={() => setIsOpen(false)}
                    preferencesState={preferencesState}
                    subtitle={subtitle}
                    tabs={availableTabs}
                    title={title}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            menuLayer,
          )
        : null}
    </>
  );
}
export type { AppShellMenuTab } from "./AppShellMenu.types";
