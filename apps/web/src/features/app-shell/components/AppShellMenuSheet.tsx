import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAppShellMenuSheetMotionTargets,
  createMenuTabActivationTransition,
  createStandardTransition,
} from "../../motion";
import { useI18n } from "../../i18n";
import type {
  AppShellMenuFooterAction,
  AppShellMenuPreferencesState,
  AppShellMenuTab,
} from "../AppShellMenu.types";
import { RoomDangerActionButton } from "../../ui/RoomDangerActionButton";
import { AppShellMenuPanels } from "./AppShellMenuPanels";
import styles from "../AppShellMenu.module.css";

interface AppShellMenuSheetProps {
  activeTab: AppShellMenuTab | null;
  activeTabId: AppShellMenuTab["id"] | undefined;
  footerAction?: AppShellMenuFooterAction;
  footerActions?: AppShellMenuFooterAction[];
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
  footerAction,
  footerActions,
  isMobileSheet,
  onClose,
  preferencesState,
  subtitle,
  tabs,
  title,
}: AppShellMenuSheetProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { t } = useI18n();
  const panelRef = useRef<HTMLElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const resolvedFooterActions = footerActions ?? (footerAction ? [footerAction] : []);
  const menuSheetMotionTargets = createAppShellMenuSheetMotionTargets(reduceMotion, isMobileSheet);
  const updatePanelFadeState = useCallback(() => {
    const panelElement = panelRef.current;
    if (!panelElement) {
      return;
    }

    const hasOverflow = panelElement.scrollHeight - panelElement.clientHeight > 1;
    const atTop = panelElement.scrollTop <= 1;
    const atBottom =
      panelElement.scrollTop + panelElement.clientHeight >= panelElement.scrollHeight - 1;

    setShowTopFade(hasOverflow && !atTop);
    setShowBottomFade(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    updatePanelFadeState();

    const panelElement = panelRef.current;
    if (!panelElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updatePanelFadeState();
    });
    resizeObserver.observe(panelElement);

    panelElement.addEventListener("scroll", updatePanelFadeState, {
      passive: true,
    });
    window.addEventListener("resize", updatePanelFadeState);

    return () => {
      resizeObserver.disconnect();
      panelElement.removeEventListener("scroll", updatePanelFadeState);
      window.removeEventListener("resize", updatePanelFadeState);
    };
  }, [activeTabId, updatePanelFadeState]);

  const handleFooterActionClick = useCallback((action: AppShellMenuFooterAction) => {
    onClose();
    action.onClick();
  }, [onClose]);

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
          {subtitle ? <p className={styles.menuSubtitle}>{subtitle}</p> : null}
          <h2 className={styles.menuTitle}>{title}</h2>
        </div>
        <button
          aria-label={t("appShell.menu.close")}
          className={`${styles.menuTrigger} ${styles.menuCloseButton}`}
          onClick={onClose}
          title={t("appShell.menu.close")}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={styles.menuTriggerIcon}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="M6 6L18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            <path d="M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <LayoutGroup id="app-shell-menu-tabs">
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
              <AnimatePresence>
                {tab.id === activeTabId ? (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className={styles.tabButtonActiveBackground}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key={`${tab.id}-active-border`}
                    transition={createMenuTabActivationTransition(reduceMotion)}
                  >
                    <span className={styles.tabButtonActiveGlow} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <span className={styles.tabButtonLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </LayoutGroup>

      <div
        className={`${styles.panelViewport} ${
          showTopFade ? styles.panelViewportTopFade : ""
        } ${showBottomFade ? styles.panelViewportBottomFade : ""}`}
      >
        <section className={styles.panel} ref={panelRef}>
          <AppShellMenuPanels activeTab={activeTab} preferencesState={preferencesState} />
        </section>
      </div>

      {resolvedFooterActions.length > 0 ? (
        <footer className={styles.menuFooter}>
          {resolvedFooterActions.map((action, index) =>
            action.tone === "danger" ? (
              <RoomDangerActionButton
                key={`${action.label}-${index}`}
                onClick={() => handleFooterActionClick(action)}
                type="button"
              >
                {action.label}
              </RoomDangerActionButton>
            ) : (
              <button
                className={styles.footerActionButton}
                key={`${action.label}-${index}`}
                onClick={() => handleFooterActionClick(action)}
                type="button"
              >
                {action.label}
              </button>
            ),
          )}
        </footer>
      ) : null}
    </motion.aside>
  );
}
