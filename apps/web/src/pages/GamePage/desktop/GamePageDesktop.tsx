import { motion, useReducedMotion } from "framer-motion";
import { createStandardTransition } from "../../../features/motion";
import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageDesktop.module.css";

export function GamePageDesktop({ model }: GamePageAssemblyProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <div className={styles.layoutGrid}>
          <motion.section
            className={styles.mainColumn}
            layout
            transition={createStandardTransition(reduceMotion)}
          >
            <TimelinePanel model={model.timeline} />
          </motion.section>

          <aside className={styles.sidebarColumn}>
            <GamePageActionPanels model={model.actions} />
          </aside>
        </div>
      </section>
    </main>
  );
}
