import { useI18n } from "../i18n";
import { useConnectionStatus } from "../../services/socket/connectionState";
import { getConnectionProblemLabelKey } from "./connectionStatusLabel";
import styles from "./ConnectionStatus.module.css";

/** Header chip for Play and Lobby; the live region stays mounted so screen readers hear changes. */
export function ConnectionStatus() {
  const { t } = useI18n();
  const labelKey = getConnectionProblemLabelKey(useConnectionStatus());

  return (
    <span aria-live="polite" className={styles.region} role="status">
      {labelKey ? <span className={styles.chip}>{t(labelKey)}</span> : null}
    </span>
  );
}
