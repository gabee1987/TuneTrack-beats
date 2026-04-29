import { motion, useReducedMotion } from "framer-motion";
import {
  MotionPresence,
  createStandardTransition,
} from "../../../features/motion";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import type { GamePageHeaderModel } from "../GamePage.types";
import styles from "../GamePage.module.css";

type HeaderLeadersStripProps = Pick<GamePageHeaderModel, "leadingPlayers" | "roomState"> & {
  show: boolean;
  getCardCountLabel: (count: number) => string;
};

export function HeaderLeadersStrip({
  getCardCountLabel,
  leadingPlayers,
  roomState,
  show,
}: HeaderLeadersStripProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const transition = createStandardTransition(reduceMotion);

  return (
    <MotionPresence initial={false} mode="popLayout">
      {show ? (
        <motion.div
          animate={{ opacity: 1 }}
          className={styles.headerLeadersDisclosure}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key="header-leaders-strip"
          transition={transition}
        >
          <div className={styles.headerLeadersStrip}>
            {leadingPlayers.map((player, index) => {
              const cardCount = roomState.timelines[player.id]?.length ?? 0;

              return (
                <article className={styles.headerLeaderChip} key={player.id}>
                  <span className={styles.headerLeaderRank}>#{index + 1}</span>
                  <strong className={styles.headerLeaderName}>{player.displayName}</strong>
                  <span className={styles.headerLeaderMeta}>
                    <CardCountAmount
                      amount={cardCount}
                      ariaLabel={getCardCountLabel(cardCount)}
                      className={styles.headerLeaderCardCount}
                    />
                    {roomState.settings.ttModeEnabled ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <TokenCountAmount amount={player.ttTokenCount} />
                      </>
                    ) : null}
                  </span>
                </article>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </MotionPresence>
  );
}
