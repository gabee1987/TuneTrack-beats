import { describe, expect, it } from "vitest";
import { getChallengeCountdownStage } from "./challengeCountdownStage";

describe("getChallengeCountdownStage", () => {
  it("stays yellow for an untimed window and above seven seconds", () => {
    expect(getChallengeCountdownStage(null)).toBe("yellow");
    expect(getChallengeCountdownStage(8)).toBe("yellow");
  });

  it("turns orange from seven seconds and red from three", () => {
    expect(getChallengeCountdownStage(7)).toBe("orange");
    expect(getChallengeCountdownStage(4)).toBe("orange");
    expect(getChallengeCountdownStage(3)).toBe("red");
    expect(getChallengeCountdownStage(0)).toBe("red");
  });
});
