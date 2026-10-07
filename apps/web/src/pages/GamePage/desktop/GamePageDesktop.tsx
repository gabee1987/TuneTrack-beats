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

        <section className={styles.mainColumn}>
          <TimelinePanel model={model.timeline} />
        </section>

        <aside className={styles.dockColumn}>
          <GamePageActionPanels model={model.actions} />
        </aside>
      </section>
    </main>
  );
}
