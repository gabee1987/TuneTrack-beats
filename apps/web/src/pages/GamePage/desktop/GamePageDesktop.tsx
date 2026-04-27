import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageDesktop.module.css";

export function GamePageDesktop({ model }: GamePageAssemblyProps) {
  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <div className={styles.layoutGrid}>
          <section className={styles.mainColumn}>
            <TimelinePanel model={model.timeline} />
          </section>

          <aside className={styles.sidebarColumn}>
            <GamePageActionPanels model={model.actions} />
          </aside>
        </div>
      </section>
    </main>
  );
}
