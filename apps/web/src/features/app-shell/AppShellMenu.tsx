import { lazy, Suspense, useEffect, useId, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import type { AppShellMenuProps } from "./AppShellMenu.types";
import styles from "./AppShellMenu.module.css";

const appShellMenuHistoryStateKey = "tunetrackAppShellMenuEntry";

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
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const historyEntryId = useId();
  const pendingActionRef = useRef<(() => void) | null>(null);
  const wasOpenRef = useRef(false);
  const locationState = isRecord(location.state) ? location.state : {};
  const isOpen = locationState[appShellMenuHistoryStateKey] === historyEntryId;

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = false;
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }, [isOpen]);

  function openMenu() {
    if (isOpen) {
      return;
    }

    navigate(
      {
        hash: location.hash,
        pathname: location.pathname,
        search: location.search,
      },
      {
        state: {
          ...locationState,
          [appShellMenuHistoryStateKey]: historyEntryId,
        },
      },
    );
  }

  function closeMenu(afterClose?: () => void) {
    if (!isOpen) {
      afterClose?.();
      return;
    }

    pendingActionRef.current = afterClose ?? null;
    navigate(-1);
  }

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
        onClick={openMenu}
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
          onClose={closeMenu}
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
