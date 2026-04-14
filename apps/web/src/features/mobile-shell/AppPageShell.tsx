import type { ReactNode } from "react";
import styles from "./AppPageShell.module.css";

interface AppPageShellProps {
  children: ReactNode;
  panelClassName?: string | undefined;
  screenClassName?: string | undefined;
}

export function AppPageShell({
  children,
  panelClassName,
  screenClassName,
}: AppPageShellProps) {
  return (
    <main
      className={`${styles.screen}${screenClassName ? ` ${screenClassName}` : ""}`}
    >
      <section
        className={`${styles.panel}${panelClassName ? ` ${panelClassName}` : ""}`}
      >
        {children}
      </section>
    </main>
  );
}
