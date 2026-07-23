import { describe, expect, it } from "vitest";
import type { PublicRoomSettings, PublicRoomState } from "@tunetrack/shared";
import type { LobbyPageController } from "../LobbyPage.types";
import { buildLobbyAssemblyModel } from "./buildLobbyAssemblyModel";

const settings: PublicRoomSettings = {
  targetTimelineCardCount: 10,
  defaultStartingTimelineCardCount: 1,
  startingTtTokenCount: 0,
  revealConfirmMode: "host_only",
  ttModeEnabled: false,
  challengeWindowDurationSeconds: 10,
  playlistImported: false,
  importedTrackCount: 0,
  spotifyAuthStatus: "none",
  spotifyAccountType: null,
  spotifyPlaybackOwnerPlayerId: null,
  spotifyPlaybackGeneration: 0,
};

function createController(
  overrides: Partial<LobbyPageController> = {},
): LobbyPageController {
  const roomState: PublicRoomState = {
    roomId: "ROOM1",
    status: "lobby",
    hostId: "host-1",
    players: [
      {
        id: "host-1",
        displayName: "Host",
        isHost: true,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: 1,
      },
    ],
    timelines: {},
    currentTrackCard: null,
    targetTimelineCardCount: 10,
    settings,
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
  };

  return {
    connectionStatus: "connected",
    currentPlayerId: "host-1",
    currentSettings: settings,
    displayName: "Host",
    errorCode: null,
    errorMessage: null,
    handleClosedRoomReset: () => undefined,
    handleCloseRoom: () => undefined,
    hasClosedRoomReset: false,
    handlePlayerKick: () => undefined,
    handlePlayerStartingCardCountChange: () => undefined,
    handlePlayerStartingTtTokenCountChange: () => undefined,
    handlePlayerProfileChange: () => undefined,
    handleRoomRename: () => undefined,
    handleRoomSettingsChange: () => undefined,
    handleStartGame: () => undefined,
    isHost: true,
    preloadGame: () => undefined,
    roomId: "ROOM1",
    roomState,
    toggleTtMode: () => undefined,
    ...overrides,
  };
}

describe("buildLobbyAssemblyModel", () => {
  it("groups shared lobby facts for mobile and desktop assemblies", () => {
    const model = buildLobbyAssemblyModel(createController());

    expect(model.room.resolvedRoomId).toBe("ROOM1");
    expect(model.room.players).toHaveLength(1);
    expect(model.room.isHost).toBe(true);
    expect(model.hostSettings.currentSettings).toBe(settings);
    expect(model.players.roomSettings).toBe(settings);
    expect(model.roomActions.isHost).toBe(true);
    expect(model.identity.resolvedRoomId).toBe("ROOM1");
  });

  it("marks started-join errors for both assemblies", () => {
    const model = buildLobbyAssemblyModel(
      createController({ errorCode: "GAME_ALREADY_STARTED", errorMessage: "started" }),
    );

    expect(model.room.hasStartedJoinError).toBe(true);
    expect(model.identity.hasStartedJoinError).toBe(true);
    expect(model.shell.errorMessage).toBe("started");
  });

  it("falls back to route room id when room state is missing", () => {
    const model = buildLobbyAssemblyModel(
      createController({ roomState: null, roomId: "fallback-room" }),
    );

    expect(model.room.resolvedRoomId).toBe("fallback-room");
    expect(model.room.players).toEqual([]);
  });
});
