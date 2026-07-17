import type { Translate } from "../../features/i18n";

export function formatChallengeCountdownLabel(
  deadlineEpochMs: number | null,
  nowEpochMs: number,
  t: Translate,
): string | null {
  if (!deadlineEpochMs) {
    return null;
  }

  const secondsRemaining = Math.max(0, Math.ceil((deadlineEpochMs - nowEpochMs) / 1000));
  return t("game.status.countdownBeat", { seconds: secondsRemaining });
}
