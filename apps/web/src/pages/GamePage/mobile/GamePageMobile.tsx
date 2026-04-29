import { motion, useReducedMotion } from "framer-motion";
import { createStandardTransition } from "../../../features/motion";
import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageMobile.module.css";

export function GamePageMobile({ model }: GamePageAssemblyProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <motion.div
          className={styles.timelineLayout}
          layout
          transition={createStandardTransition(reduceMotion)}
        >
          <TimelinePanel model={model.timeline} />
        </motion.div>

        <GamePageActionPanels model={model.actions} />
      </section>
    </main>
  );
}
