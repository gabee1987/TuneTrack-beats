import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageMobile.module.css";

export function GamePageMobile({ model }: GamePageAssemblyProps) {
  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <TimelinePanel model={model.timeline} />

        <GamePageActionPanels model={model.actions} />
      </section>
    </main>
  );
}
