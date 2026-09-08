import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { useI18n } from "../../features/i18n";
import { Button } from "../../features/ui/primitives";
import styles from "./AppRouteError.module.css";

/**
 * Without this element a route that fails to load — most often a chunk that no longer
 * exists after a deploy — leaves the navigation unresolved and the screen unchanged, so
 * the control the player tapped looks broken and only a manual refresh recovers.
 */
export function AppRouteError() {
  const { t } = useI18n();
  const error = useRouteError();

  useEffect(() => {
    console.error("[AppRouteError] a route failed to load", error);
  }, [error]);

  return (
    <main className={styles.screen}>
      <section className={styles.card} role="alert">
        <h1 className={styles.title}>{t("appError.title")}</h1>
        <p className={styles.message}>{t("appError.message")}</p>
        <div className={styles.actions}>
          <Button fullWidth onClick={() => window.location.reload()} type="button">
            {t("appError.retry")}
          </Button>
          <Button
            fullWidth
            onClick={() => window.location.assign("/")}
            type="button"
            variant="secondary"
          >
            {t("appError.home")}
          </Button>
        </div>
      </section>
    </main>
  );
}
