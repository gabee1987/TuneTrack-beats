import { DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS } from "@tunetrack/shared";

export interface ChallengeWindowOptionValues {
  defaultDuration: string;
  manual: string;
  maxDuration: string;
  minDuration: string;
}

export function getChallengeWindowSelectValue(
  challengeWindowDurationSeconds: number | null,
): string {
  return challengeWindowDurationSeconds === null
    ? "manual"
    : challengeWindowDurationSeconds.toString();
}

export function formatChallengeWindowSettingValue(
  challengeWindowDurationSeconds: number | null,
): string {
  return challengeWindowDurationSeconds === null
    ? "Manual"
    : `${challengeWindowDurationSeconds}s`;
}

export function getChallengeWindowOptionValues(): string[] {
  return Object.values(getChallengeWindowOptionValueMap());
}

export function getChallengeWindowOptionValueMap(): ChallengeWindowOptionValues {
  return {
    manual: "manual",
    defaultDuration: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
    minDuration: "5",
    maxDuration: "15",
  };
}
