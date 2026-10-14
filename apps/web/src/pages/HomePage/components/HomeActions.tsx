import { useId } from "react";
import { useI18n } from "../../../features/i18n";
import { IdentityChip } from "../../../features/profile/IdentityChip";
import { NameSheet } from "../../../features/profile/NameSheet";
import { Button } from "../../../features/ui/primitives";
import type { HomePageAssemblyProps } from "../HomePage.types";
import styles from "./HomeActions.module.css";

/** Who you play as, Host a game, Join a game and the sub-label (`22` §4.1); both layouts. */
export function HomeActions({ controller }: HomePageAssemblyProps) {
  const { t } = useI18n();
  const hintId = useId();
  const reasonId = useId();
  const hostDescription = controller.hostDisabledReason ? `${reasonId} ${hintId}` : hintId;

  return (
    <div className={styles.actions}>
      {controller.identity ? (
        <IdentityChip
          className={styles.identity}
          disabled={controller.isHosting}
          displayName={controller.identity.displayName}
          onChange={controller.identity.onChange}
        />
      ) : null}

      <Button
        aria-describedby={hostDescription}
        disabled={controller.hostDisabledReason !== null}
        fullWidth
        haptic
        isLoading={controller.isHosting}
        loadingLabel={t("home.hosting")}
        onClick={controller.handleHost}
        onFocus={controller.preloadLobby}
        onMouseEnter={controller.preloadLobby}
        onTouchStart={controller.preloadLobby}
        size="lg"
      >
        {t("home.host")}
      </Button>
      {controller.hostDisabledReason ? (
        <p className={styles.reason} id={reasonId}>
          {controller.hostDisabledReason}
        </p>
      ) : null}

      <Button
        disabled={controller.isHosting}
        fullWidth
        onClick={controller.handleJoin}
        size="lg"
        variant="secondary"
      >
        {t("home.join")}
      </Button>

      <p className={styles.hint} id={hintId}>
        {t("home.hint")}
      </p>

      <NameSheet {...controller.nameSheetProps} />
    </div>
  );
}
