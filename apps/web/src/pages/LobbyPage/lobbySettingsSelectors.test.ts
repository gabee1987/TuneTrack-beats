import { DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import {
  formatChallengeWindowSettingValue,
  getChallengeWindowOptionValues,
  getChallengeWindowOptionValueMap,
  getChallengeWindowSelectValue,
} from "./lobbySettingsSelectors";

describe("lobbySettingsSelectors", () => {
  it("formats manual and timed challenge window labels", () => {
    expect(formatChallengeWindowSettingValue(null)).toBe("Manual");
    expect(formatChallengeWindowSettingValue(12)).toBe("12s");
  });

  it("maps challenge window state to select values", () => {
    expect(getChallengeWindowSelectValue(null)).toBe("manual");
    expect(getChallengeWindowSelectValue(9)).toBe("9");
  });

  it("returns stable challenge window option values", () => {
    expect(getChallengeWindowOptionValues()).toEqual([
      "manual",
      DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
      "5",
      "15",
    ]);
  });

  it("returns named challenge window option values for the settings surface", () => {
    expect(getChallengeWindowOptionValueMap()).toEqual({
      manual: "manual",
      defaultDuration: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
      minDuration: "5",
      maxDuration: "15",
    });
  });
});
