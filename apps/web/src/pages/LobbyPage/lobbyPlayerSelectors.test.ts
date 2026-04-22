import type { PublicPlayerState, PublicRoomSettings } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { getLobbyPlayerDisplayState } from "./lobbyPlayerSelectors";

const basePlayer: PublicPlayerState = {
  id: "player-1",
  displayName: "Nova",
  isHost: false,
  startingTimelineCardCount: 4,
  ttTokenCount: 2,
};

const baseRoomSettings: PublicRoomSettings = {
  challengeWindowDurationSeconds: null,
  defaultStartingTimelineCardCount: 4,
  revealConfirmMode: "host_only",
  startingTtTokenCount: 1,
  targetTimelineCardCount: 10,
  ttModeEnabled: false,
};

describe("lobbyPlayerSelectors", () => {
  it("formats the current player display state", () => {
    expect(
      getLobbyPlayerDisplayState({
        currentPlayerId: "player-1",
        player: basePlayer,
        roomSettings: baseRoomSettings,
      }),
    ).toEqual({
      primaryName: "You",
      startingCardsLabel: "Starting cards",
      counterBadges: [{ label: "4 cards", variant: "neutral" }],
    });
  });

  it("adds tt and host badges when applicable", () => {
    expect(
      getLobbyPlayerDisplayState({
        currentPlayerId: "someone-else",
        player: {
          ...basePlayer,
          isHost: true,
        },
        roomSettings: {
          ...baseRoomSettings,
          ttModeEnabled: true,
        },
      }),
    ).toEqual({
      primaryName: "Nova",
      startingCardsLabel: "Starting cards",
      counterBadges: [
        { label: "4 cards", variant: "neutral" },
        { label: "2 TT", variant: "neutral" },
        { label: "Host", variant: "strong" },
      ],
    });
  });
});
