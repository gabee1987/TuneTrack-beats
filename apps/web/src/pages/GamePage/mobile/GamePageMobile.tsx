import { m } from "framer-motion";
import { createStandardTransition, useReducedMotionPreference } from "../../../features/motion";
import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageMobile.module.css";

export function GamePageMobile({ model }: GamePageAssemblyProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <m.div
          className={styles.timelineLayout}
          layout="position"
          transition={createStandardTransition(reduceMotion)}
        >
          <TimelinePanel model={model.timeline} />
        </m.div>

        <GamePageActionPanels model={model.actions} />
      </section>
    </main>
  );
}
