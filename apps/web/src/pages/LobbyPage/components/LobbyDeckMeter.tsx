import { useId } from "react";
import { useI18n } from "../../../features/i18n";
import { classNames } from "../../../features/ui/classNames";
import type { LobbyDeckMeter as LobbyDeckMeterModel } from "../hooks/lobbySetupModel";
import styles from "./LobbyDeckMeter.module.css";

/** Songs in the deck against what this many players need to reach the target (decision 6 warns). */
export function LobbyDeckMeter({ meter }: { meter: LobbyDeckMeterModel }) {
  const { t } = useI18n();
  const textId = useId();
  const fill = Math.min(meter.current / meter.required, 1);
  const text = meter.isEnough
    ? t("lobby.deck.ok", { players: meter.playerCount })
    : getShortDeckText(meter, t);

  return (
    <div className={styles.meter}>
      <div
        aria-describedby={textId}
        aria-label={t("lobby.deck.meterLabel")}
        aria-valuemax={meter.required}
        aria-valuemin={0}
        aria-valuenow={Math.min(meter.current, meter.required)}
        className={styles.track}
        role="meter"
      >
        <span
          className={classNames(styles.fill, meter.isEnough ? undefined : styles.short)}
          style={{ transform: `scaleX(${fill})` }}
        />
      </div>
      <p
        className={classNames(styles.text, meter.isEnough ? undefined : styles.shortText)}
        id={textId}
      >
        {text}
      </p>
    </div>
  );
}

export function getShortDeckText(
  meter: LobbyDeckMeterModel,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return t("lobby.deck.short", {
    count: meter.current,
    players: meter.playerCount,
    required: meter.required,
    target: meter.target,
  });
}
