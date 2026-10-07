import { motion } from "framer-motion";
import {
  MotionPresence,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import type { GamePageHeaderModel } from "../GamePage.types";
import styles from "../gamePageStyles";

type HeaderLeadersStripProps = Pick<GamePageHeaderModel, "leadingPlayers" | "ttModeEnabled"> & {
  show: boolean;
  getCardCountLabel: (count: number) => string;
};

export function HeaderLeadersStrip({
  getCardCountLabel,
  leadingPlayers,
  show,
  ttModeEnabled,
}: HeaderLeadersStripProps) {
  const reduceMotion = useReducedMotionPreference();
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
            {leadingPlayers.map((player, index) => (
              <article className={styles.headerLeaderChip} key={player.id}>
                <span className={styles.headerLeaderRank}>#{index + 1}</span>
                <strong className={styles.headerLeaderName}>{player.displayName}</strong>
                <span className={styles.headerLeaderMeta}>
                  <CardCountAmount
                    amount={player.cardCount}
                    ariaLabel={getCardCountLabel(player.cardCount)}
                    className={styles.headerLeaderCardCount}
                  />
                  {ttModeEnabled ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <TokenCountAmount amount={player.ttTokenCount} />
                    </>
                  ) : null}
                </span>
              </article>
            ))}
          </div>
        </motion.div>
      ) : null}
    </MotionPresence>
  );
}
