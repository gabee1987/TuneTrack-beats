import { lazy, Suspense, useState } from "react";
import type { AppShellMenuProps } from "./AppShellMenu.types";
import styles from "./AppShellMenu.module.css";

async function loadAppShellMenuDialog() {
  const module = await import("./components/AppShellMenuDialog");
  return { default: module.AppShellMenuDialog };
}

const AppShellMenuDialog = lazy(loadAppShellMenuDialog);

export function AppShellMenu({ title, subtitle, tabs }: AppShellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
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
        type="button"
      >
        Menu
      </button>

      {isOpen ? (
        <Suspense fallback={null}>
          <AppShellMenuDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            subtitle={subtitle}
            tabs={tabs}
            title={title}
          />
        </Suspense>
      ) : null}
    </>
  );
}
export type { AppShellMenuTab } from "./AppShellMenu.types";
