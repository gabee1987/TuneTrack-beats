import { motion, useReducedMotion } from "framer-motion";
import {
  createAppShellMenuSheetMotionTargets,
  createStandardTransition,
} from "../../motion";
import type {
  AppShellMenuPreferencesState,
  AppShellMenuTab,
} from "../AppShellMenu.types";
import { AppShellMenuPanels } from "./AppShellMenuPanels";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuSheetProps {
  activeTab: AppShellMenuTab | null;
  activeTabId: AppShellMenuTab["id"] | undefined;
  isMobileSheet: boolean;
  onClose: () => void;
  preferencesState: AppShellMenuPreferencesState;
  subtitle: string;
  tabs: AppShellMenuTab[];
  title: string;
}

export function AppShellMenuSheet({
  activeTab,
  activeTabId,
  isMobileSheet,
  onClose,
  preferencesState,
  subtitle,
  tabs,
  title,
}: AppShellMenuSheetProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const menuSheetMotionTargets = createAppShellMenuSheetMotionTargets(
    reduceMotion,
    isMobileSheet,
  );

  return (
    <motion.aside
      animate={menuSheetMotionTargets.animate}
      className={styles.menuSheet}
      exit={menuSheetMotionTargets.exit}
      initial={menuSheetMotionTargets.initial}
      onClick={(event) => event.stopPropagation()}
      transition={createStandardTransition(reduceMotion)}
    >
      <header className={styles.menuHeader}>
        <div>
          <h2 className={styles.menuTitle}>{title}</h2>
          <p className={styles.menuSubtitle}>{subtitle}</p>
        </div>
        <button
          className={styles.menuCloseButton}
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>

      <nav className={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            className={`${styles.tabButton} ${
              tab.id === activeTabId ? styles.tabButtonActive : ""
            }`}
            key={tab.id}
            onClick={() => preferencesState.setLastOpenedMenuTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.panel}>
        <AppShellMenuPanels
          activeTab={activeTab}
          preferencesState={preferencesState}
        />
      </section>
    </motion.aside>
  );
}
