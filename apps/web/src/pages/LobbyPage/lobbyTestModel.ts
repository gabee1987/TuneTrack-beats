import type { PublicRoomSettings, PublicRoomState } from "@tunetrack/shared/client";
import { vi } from "vitest";
import { TEST_HOST_ID, buildLobbyRoomState, buildRoomSettings } from "../../test/roomStateFixtures";
import type { LobbyPageController } from "./LobbyPage.types";
import { buildLobbyAssemblyModel } from "./hooks/buildLobbyAssemblyModel";
import { selectLobbySetup } from "./hooks/lobbySetupModel";

export const practiceDeck: Partial<PublicRoomSettings> = {
  deckSource: "practice",
  importedTrackCount: 60,
};

export interface LobbyTestModelOptions {
  currentPlayerId?: string;
  /** `null`: the room is still being created. */
  roomState?: PublicRoomState | null;
  settings?: Partial<PublicRoomSettings>;
}

/** The lobby model both assemblies render, over a controller whose handlers are spies. */
export function buildLobbyTestModel({
  currentPlayerId = TEST_HOST_ID,
  roomState,
  settings = {},
}: LobbyTestModelOptions = {}) {
  const currentSettings = buildRoomSettings(settings);
  const resolvedRoomState =
    roomState === undefined ? buildLobbyRoomState({ settings: currentSettings }) : roomState;
  const controller = {
    closeRoomActionStatus: "idle",
    handleCloseRoom: vi.fn(),
    handlePlayerKick: vi.fn(),
    handlePlayerStartingCardCountChange: vi.fn(),
    handlePlayerStartingTtTokenCountChange: vi.fn(),
    handleRoomSettingsChange: vi.fn(),
    currentPlayerId,
    currentSettings,
    displayName: "Player One",
    errorCode: null,
    errorMessage: null,
    handlePlayerProfileChange: vi.fn(async () => true),
    handleRoomRename: vi.fn(async () => true),
    handleStartGame: vi.fn(),
    identityActionState: null,
    isHost: resolvedRoomState?.hostId === currentPlayerId || resolvedRoomState === null,
    isIdentityActionPending: false,
    preloadGame: vi.fn(),
    roomId: resolvedRoomState?.roomId,
    roomState: resolvedRoomState,
    startGameActionStatus: "idle",
    toggleTtMode: vi.fn(),
  } as unknown as LobbyPageController;
  const setup = selectLobbySetup({
    connectionStatus: "connected",
    currentPlayerId,
    roomState: resolvedRoomState,
    settings: currentSettings,
    startGameActionStatus: "idle",
  });

  return { controller, model: buildLobbyAssemblyModel(controller, setup) };
}
