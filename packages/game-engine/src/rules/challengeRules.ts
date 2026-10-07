import type { GameState } from "../domain/GameState.js";

export function isChallengeWindowExpired(gameState: GameState, nowEpochMs: number): boolean {
  const deadlineEpochMs = gameState.challengeState?.challengeDeadlineEpochMs;
  return (
    gameState.phase === "challenge" && deadlineEpochMs != null && nowEpochMs >= deadlineEpochMs
  );
}
