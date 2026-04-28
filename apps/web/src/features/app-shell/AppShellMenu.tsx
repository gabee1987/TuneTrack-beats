import { lazy, Suspense, useState } from "react";
import { useI18n } from "../i18n";
import type { AppShellMenuProps } from "./AppShellMenu.types";
import styles from "./AppShellMenu.module.css";

async function loadAppShellMenuDialog() {
  const module = await import("./components/AppShellMenuDialog");
  return { default: module.AppShellMenuDialog };
}

const AppShellMenuDialog = lazy(loadAppShellMenuDialog);

export function AppShellMenu({
  footerAction,
  footerActions,
  title,
  subtitle,
  tabs,
}: AppShellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button
        aria-label={t("appShell.menu.open")}
        className={styles.menuTrigger}
        onFocus={() => {
          void loadAppShellMenuDialog();
        }}
        onMouseEnter={() => {
          void loadAppShellMenuDialog();
        }}
        onClick={() => setIsOpen(true)}
        onTouchStart={() => {
          void loadAppShellMenuDialog();
        }}
        title={t("appShell.menu.open")}
        type="button"
      >
        <svg aria-hidden="true" className={styles.menuTriggerIcon} viewBox="0 0 24 24">
          <path
            d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.1 7.1 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.1 7.1 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a8.8 8.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.1 7.1 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.1 7.1 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Suspense fallback={null}>
        <AppShellMenuDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          subtitle={subtitle}
          tabs={tabs}
          title={title}
          {...(footerAction ? { footerAction } : {})}
          {...(footerActions ? { footerActions } : {})}
        />
      </Suspense>
    </>
  );
}
export type { AppShellMenuTab } from "./AppShellMenu.types";
