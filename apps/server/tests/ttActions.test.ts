import { describe, expect, it } from "vitest";
import { createTestRoomCore } from "./support/roomCore.js";
import { buildYearDeck } from "./support/decks.js";

describe("tt actions", () => {
  it("lets the active player skip and buy with TT when TT mode is enabled", () => {
    const roomCore = createTestRoomCore();

    const hostJoin = roomCore.lobby.createRoom(
      "tt-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomCore.lobby.addPlayerToRoom(
      "tt-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const tokenSettingsRoomState = roomCore.lobby.updateRoomSettings("host-socket", "tt-room", {
      roomId: "tt-room",
      targetTimelineCardCount: 10,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 4,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 10,
    });
    expect(
      tokenSettingsRoomState.players.find((player) => player.id === hostJoin.playerId)
        ?.ttTokenCount,
    ).toBe(4);
    expect(
      tokenSettingsRoomState.players.find((player) => player.id === guestJoin.playerId)
        ?.ttTokenCount,
    ).toBe(4);
    roomCore.lobby.updatePlayerSettings("host-socket", {
      roomId: "tt-room",
      playerId: guestJoin.playerId,
      startingTimelineCardCount: 1,
      startingTtTokenCount: 2,
    });

    const startedRoomState = roomCore.gameplay.startGame(
      "host-socket",
      { roomId: "tt-room" },
      buildYearDeck([1980, 1990, 2000, 2005, 2010, 2020], "tt-track"),
    );

    expect(startedRoomState.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(startedRoomState.currentTrackCard?.id).toBe("tt-track-3");
    expect(
      startedRoomState.players.find((player) => player.id === hostJoin.playerId)?.ttTokenCount,
    ).toBe(4);
    expect(
      startedRoomState.players.find((player) => player.id === guestJoin.playerId)?.ttTokenCount,
    ).toBe(2);

    const roomAfterSkip = roomCore.gameplay.skipTrackWithTt("host-socket", {
      roomId: "tt-room",
    });

    expect(roomAfterSkip.currentTrackCard?.id).toBe("tt-track-4");
    expect(
      roomAfterSkip.players.find((player) => player.id === hostJoin.playerId)?.ttTokenCount,
    ).toBe(3);
    expect(roomAfterSkip.turn?.hasUsedSkipTrackWithTt).toBe(true);

    expect(() => roomCore.gameplay.skipTrackWithTt("host-socket", { roomId: "tt-room" })).toThrow(
      "SKIP_ALREADY_USED_THIS_TURN",
    );

    const roomAfterBuy = roomCore.gameplay.buyTimelineCardWithTt("host-socket", {
      roomId: "tt-room",
    });

    expect(roomAfterBuy.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(roomAfterBuy.status).toBe("reveal");
    expect(roomAfterBuy.currentTrackCard?.id).toBe("tt-track-4");
    expect(
      roomAfterBuy.players.find((player) => player.id === hostJoin.playerId)?.ttTokenCount,
    ).toBe(0);
    expect(roomAfterBuy.timelines[hostJoin.playerId]).toHaveLength(2);
    expect(roomAfterBuy.revealState).toEqual(
      expect.objectContaining({
        revealType: "tt_buy",
        awardedPlayerId: hostJoin.playerId,
      }),
    );

    expect(() => roomCore.gameplay.skipTrackWithTt("guest-socket", { roomId: "tt-room" })).toThrow(
      "GAME_NOT_IN_TURN_PHASE",
    );
    expect(() =>
      roomCore.gameplay.buyTimelineCardWithTt("guest-socket", { roomId: "tt-room" }),
    ).toThrow("GAME_NOT_IN_TURN_PHASE");

    expect(guestJoin.playerId).toBeDefined();
  });
});
