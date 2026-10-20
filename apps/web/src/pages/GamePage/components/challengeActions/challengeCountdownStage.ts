export type ChallengeCountdownStage = "yellow" | "orange" | "red";

/** The callout warms up as the Beat! window runs out; an untimed window stays yellow. */
export function getChallengeCountdownStage(
  countdownSeconds: number | null,
): ChallengeCountdownStage {
  if (countdownSeconds !== null && countdownSeconds <= 3) return "red";
  if (countdownSeconds !== null && countdownSeconds <= 7) return "orange";
  return "yellow";
}
