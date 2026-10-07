import { m } from "framer-motion";
import { useI18n } from "../i18n";
import { MotionPresence, createToastSlideMotion, useReducedMotionPreference } from "../motion";
import { useConnectionStatus } from "../../services/socket/connectionState";
import { getConnectionProblemLabelKey } from "./connectionStatusLabel";
import styles from "./ConnectionBanner.module.css";

/** Game-surface notice; it sits at the top of the toast stack so the two never overlap. */
export function ConnectionBanner() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const labelKey = getConnectionProblemLabelKey(useConnectionStatus());

  return (
    <div aria-live="polite" role="status">
      <MotionPresence>
        {labelKey ? (
          <m.p
            animate="animate"
            className={styles.banner}
            exit="exit"
            initial="initial"
            key="connection-banner"
            variants={createToastSlideMotion(reduceMotion)}
          >
            {t(labelKey)}
          </m.p>
        ) : null}
      </MotionPresence>
    </div>
  );
}
