import { motion } from "framer-motion";
import {
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageDesktop.module.css";

export function GamePageDesktop({ model }: GamePageAssemblyProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader model={model.header} />

        <motion.section
          className={styles.mainColumn}
          layout
          transition={createStandardTransition(reduceMotion)}
        >
          <TimelinePanel model={model.timeline} />
        </motion.section>

        <aside className={styles.dockColumn}>
          <GamePageActionPanels model={model.actions} />
        </aside>
      </section>
    </main>
  );
}
