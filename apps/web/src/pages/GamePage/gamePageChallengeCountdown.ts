import type { Translate } from "../../features/i18n";

export function formatChallengeCountdownLabel(
  deadlineEpochMs: number | null,
  nowEpochMs: number,
  t: Translate,
): string | null {
  if (!deadlineEpochMs) {
    return null;
  }

  return t("game.status.countdownBeat", {
    seconds: getChallengeSecondsRemaining(deadlineEpochMs, nowEpochMs),
  });
}

export function getChallengeSecondsRemaining(deadlineEpochMs: number, nowEpochMs: number) {
  return Math.max(0, Math.ceil((deadlineEpochMs - nowEpochMs) / 1000));
}
