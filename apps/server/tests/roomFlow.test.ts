import type { GameTrackCard } from "@tunetrack/game-engine";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PlaylistTracksPayload,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { afterEach, describe, expect, it } from "vitest";
import { io as createSocketClient, type Socket } from "socket.io-client";
import { createHttpServer } from "../src/app/createHttpServer.js";
import { createSocketServer } from "../src/app/createSocketServer.js";
import { DeckService } from "../src/decks/DeckService.js";
import { PlaylistImportService } from "../src/decks/PlaylistImportService.js";
import { registerSocketHandlers } from "../src/realtime/registerSocketHandlers.js";
import { RoomRegistry } from "../src/rooms/RoomRegistry.js";
import { RoomService } from "../src/rooms/RoomService.js";
import { SpotifyApiClient } from "../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../src/spotify/SpotifyAuthService.js";
import { SpotifyTokenStore } from "../src/spotify/SpotifyTokenStore.js";

interface TestServerContext {
  baseUrl: string;
  close: () => Promise<void>;
}

const sockets: Socket[] = [];
const serverClosers: Array<() => Promise<void>> = [];

afterEach(async () => {
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  sockets.length = 0;

  await Promise.all(serverClosers.map((closeServer) => closeServer()));
  serverClosers.length = 0;
});

describe("room flow", () => {
  it("lets two clients join one room, updates settings as host, and preserves lobby host while reconnecting", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const roomWithTwoPlayersPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.players.length === 2,
    );
    const connectionPromises = [
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ];

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all(connectionPromises);

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "party-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "party-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
    ]);

    const roomWithTwoPlayers = await roomWithTwoPlayersPromise;

    expect(roomWithTwoPlayers.hostId).toBe(hostIdentity.playerId);
    expect(roomWithTwoPlayers.players).toEqual([
      expect.objectContaining({
        displayName: "Host Player",
        isHost: true,
      }),
      expect.objectContaining({
        displayName: "Guest Player",
        isHost: false,
      }),
    ]);

    const guestErrorPromise = waitForEvent<ServerErrorPayload>(
      guestSocket,
      ServerToClientEvent.Error,
    );

    guestSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });

    await expect(guestErrorPromise).resolves.toEqual({
      code: "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS",
      message: "Only the host can change room settings.",
    });

    const updatedRoomPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.targetTimelineCardCount === 12,
    );

    hostSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "party-room",
      targetTimelineCardCount: 12,
    });

    const updatedRoomState = await updatedRoomPromise;
    expect(updatedRoomState.targetTimelineCardCount).toBe(12);

    const hostDisconnectedPromise = waitForStateUpdate(
      guestSocket,
      (roomState) =>
        roomState.hostId === hostIdentity.playerId &&
        roomState.players.some(
          (player) =>
            player.id === hostIdentity.playerId &&
            player.connectionStatus === "disconnected",
        ),
    );

    hostSocket.disconnect();

    const roomAfterHostDisconnect = await hostDisconnectedPromise;
    expect(roomAfterHostDisconnect.players).toHaveLength(2);
    expect(roomAfterHostDisconnect.hostId).toBe(hostIdentity.playerId);
    expect(
      roomAfterHostDisconnect.players.find(
        (player) => player.id === hostIdentity.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isHost: true,
      }),
    );
    expect(
      roomAfterHostDisconnect.players.find(
        (player) => player.id === guestIdentity.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        id: guestIdentity.playerId,
        connectionStatus: "connected",
        isHost: false,
      }),
    );
  });

  it("renames a lobby room for all members and restores stale-route reconnects into the renamed room", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ]);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "party-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "party-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
    ]);

    const hostRenamedPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.roomId === "renamed-room",
    );
    const guestRenamedPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.roomId === "renamed-room",
    );

    hostSocket.emit(ClientToServerEvent.RenameRoom, {
      roomId: "party-room",
      nextRoomId: "renamed-room",
    });

    const [hostRenamedState, guestRenamedState] = await Promise.all([
      hostRenamedPromise,
      guestRenamedPromise,
    ]);

    expect(hostRenamedState.hostId).toBe(hostIdentity.playerId);
    expect(guestRenamedState.players.map((player) => player.id)).toContain(
      guestIdentity.playerId,
    );

    guestSocket.disconnect();

    const refreshedGuestSocket = createClient(serverContext.baseUrl);
    refreshedGuestSocket.connect();
    await waitForEvent(refreshedGuestSocket, "connect");

    const refreshedIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      refreshedGuestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const refreshedStatePromise = waitForStateUpdate(
      refreshedGuestSocket,
      (roomState) =>
        roomState.roomId === "renamed-room" &&
        roomState.players.some(
          (player) =>
            player.id === guestIdentity.playerId &&
            player.connectionStatus === "connected",
        ),
    );

    refreshedGuestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "party-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    await expect(refreshedIdentityPromise).resolves.toEqual(guestIdentity);
    await expect(refreshedStatePromise).resolves.toEqual(
      expect.objectContaining({ roomId: "renamed-room" }),
    );
  });

  it("moves an existing lobby session to a newly requested room when it is not a rename redirect", () => {
    const roomRegistry = new RoomRegistry();
    const changedRoomStates: PublicRoomState[] = [];
    roomRegistry.setRoomStateChangedListener((roomState) => {
      changedRoomStates.push(roomState);
    });

    const hostJoin = roomRegistry.createRoom(
      "room-a",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "room-a",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const movedGuestJoin = roomRegistry.createRoom(
      "room-b",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    expect(movedGuestJoin.roomState).toEqual(
      expect.objectContaining({
        roomId: "room-b",
        hostId: movedGuestJoin.playerId,
      }),
    );
    expect(movedGuestJoin.playerId).not.toBe(guestJoin.playerId);
    expect(movedGuestJoin.roomState.players).toHaveLength(1);
    expect(
      roomRegistry.getRoomStateForMember("host-socket", "room-a").players,
    ).toEqual([
      expect.objectContaining({
        id: hostJoin.playerId,
        displayName: "Host Player",
      }),
    ]);
    expect(changedRoomStates.at(-1)).toEqual(
      expect.objectContaining({
        roomId: "room-a",
        players: [
          expect.objectContaining({
            id: hostJoin.playerId,
          }),
        ],
      }),
    );
  });

  it("rejects new room creation once the active room limit is reached", async () => {
    const serverContext = await startTestServer();

    for (let index = 1; index <= 5; index += 1) {
      const socket = createClient(serverContext.baseUrl);
      socket.connect();
      await waitForEvent(socket, "connect");

      const identityPromise = waitForEvent<PlayerIdentityPayload>(
        socket,
        ServerToClientEvent.PlayerIdentity,
      );

      socket.emit(ClientToServerEvent.CreateRoom, {
        roomId: `room-${index}`,
        displayName: `Player ${index}`,
        sessionId: `session-${index}`,
      });

      await identityPromise;
    }

    const extraSocket = createClient(serverContext.baseUrl);
    extraSocket.connect();
    await waitForEvent(extraSocket, "connect");

    const errorPromise = waitForEvent<ServerErrorPayload>(
      extraSocket,
      ServerToClientEvent.Error,
    );

    extraSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "room-6",
      displayName: "Extra Player",
      sessionId: "session-6",
    });

    await expect(errorPromise).resolves.toEqual({
      code: "ROOM_LIMIT_REACHED",
      message:
        "The room limit has been reached. Close a room before creating a new one.",
    });
  });

  it("lets the host manually transfer host controls to another connected player", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ]);

    const twoPlayerLobbyPromise = waitForStateUpdate(
      guestSocket,
      (roomState) =>
        roomState.status === "lobby" && roomState.players.length === 2,
    );

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "xfer-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "xfer-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
      twoPlayerLobbyPromise,
    ]);

    const transferredStatePromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.hostId === guestIdentity.playerId,
    );

    hostSocket.emit(ClientToServerEvent.TransferHost, {
      roomId: "xfer-room",
      playerId: guestIdentity.playerId,
    });

    const transferredState = await transferredStatePromise;

    expect(transferredState.players).toEqual([
      expect.objectContaining({
        id: hostIdentity.playerId,
        isHost: false,
      }),
      expect.objectContaining({
        id: guestIdentity.playerId,
        isHost: true,
      }),
    ]);

    const oldHostErrorPromise = waitForEvent<ServerErrorPayload>(
      hostSocket,
      ServerToClientEvent.Error,
    );

    hostSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "xfer-room",
      targetTimelineCardCount: 12,
    });

    await expect(oldHostErrorPromise).resolves.toEqual({
      code: "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS",
      message: "Only the host can change room settings.",
    });

    const newHostUpdatePromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.targetTimelineCardCount === 12,
    );

    guestSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "xfer-room",
      targetTimelineCardCount: 12,
    });

    await expect(newHostUpdatePromise).resolves.toEqual(
      expect.objectContaining({
        hostId: guestIdentity.playerId,
        targetTimelineCardCount: 12,
      }),
    );
  });

  it("starts a game, rejects inactive placement, resolves reveal, and advances turn", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const twoPlayerLobbyPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
    );
    const connectionPromises = [
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ];

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all(connectionPromises);

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "game-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "game-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
      twoPlayerLobbyPromise,
    ]);

    const gameTurnPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 1,
    );

    hostSocket.emit(ClientToServerEvent.StartGame, {
      roomId: "game-room",
    });

    const firstTurnState = await gameTurnPromise;

    expect(firstTurnState.turn).toEqual({
      activePlayerId: hostIdentity.playerId,
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    });
    expect(firstTurnState.currentTrackCard).toEqual({
      id: "test-track-3",
      title: "Middle Song",
      artist: "Test Artist 3",
      albumTitle: "Test Album 3",
      genre: "Pop",
      releaseYear: 1990,
    });
    expect(firstTurnState.timelines[hostIdentity.playerId]).toEqual([
      {
        id: "test-track-1",
        title: "Older Song",
        artist: "Test Artist 1",
        albumTitle: "Test Album 1",
        genre: "Rock",
        releaseYear: 1980,
        revealedYear: 1980,
      },
    ]);

    const inactivePlayerErrorPromise = waitForEvent<ServerErrorPayload>(
      guestSocket,
      ServerToClientEvent.Error,
    );

    guestSocket.emit(ClientToServerEvent.PlaceCard, {
      roomId: "game-room",
      selectedSlotIndex: 0,
    });

    await expect(inactivePlayerErrorPromise).resolves.toEqual({
      code: "NOT_ACTIVE_PLAYER",
      message: "It is not your turn.",
    });

    const revealStatePromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "reveal",
    );

    hostSocket.emit(ClientToServerEvent.PlaceCard, {
      roomId: "game-room",
      selectedSlotIndex: 1,
    });

    const revealState = await revealStatePromise;

    expect(revealState.revealState).toEqual({
      playerId: hostIdentity.playerId,
      placedCard: {
        id: "test-track-3",
        title: "Middle Song",
        artist: "Test Artist 3",
        albumTitle: "Test Album 3",
        genre: "Pop",
        releaseYear: 1990,
        revealedYear: 1990,
      },
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: hostIdentity.playerId,
      awardedSlotIndex: 1,
    });

    const revealConfirmErrorPromise = waitForEvent<ServerErrorPayload>(
      guestSocket,
      ServerToClientEvent.Error,
    );

    guestSocket.emit(ClientToServerEvent.ConfirmReveal, {
      roomId: "game-room",
    });

    await expect(revealConfirmErrorPromise).resolves.toEqual({
      code: "ONLY_HOST_CAN_CONFIRM_REVEAL",
      message: "Only the host can confirm the reveal.",
    });

    const secondTurnPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 2,
    );

    hostSocket.emit(ClientToServerEvent.ConfirmReveal, {
      roomId: "game-room",
    });

    const secondTurnState = await secondTurnPromise;

    expect(secondTurnState.turn).toEqual({
      activePlayerId: guestIdentity.playerId,
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    });
    expect(secondTurnState.currentTrackCard?.id).toBe("test-track-4");
    expect(secondTurnState.revealState).toBeNull();
  });

  it("restores the same player identity after a refresh during an active game", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const connectionPromises = [
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ];

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all(connectionPromises);

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "rejoin-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "rejoin-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
      waitForStateUpdate(
        guestSocket,
        (roomState) =>
          roomState.status === "lobby" && roomState.players.length === 2,
      ),
    ]);

    const firstTurnPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 1,
    );

    hostSocket.emit(ClientToServerEvent.StartGame, {
      roomId: "rejoin-room",
    });

    await firstTurnPromise;

    hostSocket.disconnect();

    const transferredHostState = await waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.hostId === guestIdentity.playerId,
    );
    expect(transferredHostState.players).toHaveLength(2);
    expect(
      transferredHostState.players.find(
        (player) => player.id === hostIdentity.playerId,
      ),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isHost: false,
      }),
    );

    const refreshedHostSocket = createClient(serverContext.baseUrl);
    const refreshedHostConnectPromise = waitForEvent(refreshedHostSocket, "connect");
    const refreshedIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      refreshedHostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    const refreshedStatePromise = waitForStateUpdate(
      refreshedHostSocket,
      (roomState) => roomState.status === "turn" && roomState.roomId === "rejoin-room",
    );

    refreshedHostSocket.connect();
    await refreshedHostConnectPromise;

    refreshedHostSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "rejoin-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });

    const refreshedIdentity = await refreshedIdentityPromise;
    const refreshedState = await refreshedStatePromise;

    expect(refreshedIdentity.playerId).toBe(hostIdentity.playerId);
    expect(refreshedState.players).toHaveLength(2);
    expect(refreshedState.hostId).toBe(guestIdentity.playerId);
    expect(
      refreshedState.players.find((player) => player.id === hostIdentity.playerId),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: false,
      }),
    );
    expect(refreshedState.status).toBe("turn");
  });

  it("lets the host close the room for everyone", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ]);

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "close-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "close-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    await waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
    );

    const roomClosedPromise = waitForEvent<{ roomId: string; message: string }>(
      guestSocket,
      ServerToClientEvent.RoomClosed,
    );

    hostSocket.emit(ClientToServerEvent.CloseRoom, {
      roomId: "close-room",
    });

    await expect(roomClosedPromise).resolves.toEqual({
      roomId: "close-room",
      message: "The host closed this room.",
    });
  });

  it("notifies a kicked player so their client can leave the room", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ]);

    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "kick-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "kick-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const guestIdentity = await guestIdentityPromise;

    const kickedPromise = waitForEvent<{ roomId: string; message: string }>(
      guestSocket,
      ServerToClientEvent.RoomClosed,
    );
    const hostStatePromise = waitForStateUpdate(
      hostSocket,
      (roomState) =>
        roomState.roomId === "kick-room" &&
        !roomState.players.some((player) => player.id === guestIdentity.playerId),
    );

    hostSocket.emit(ClientToServerEvent.KickPlayer, {
      roomId: "kick-room",
      playerId: guestIdentity.playerId,
    });

    await expect(kickedPromise).resolves.toEqual({
      roomId: "kick-room",
      reason: "kicked",
      roomName: "kick-room",
      message: "You were removed from this room.",
    });
    await expect(hostStatePromise).resolves.toEqual(
      expect.objectContaining({ roomId: "kick-room" }),
    );
  });

  it("removes kicked players from future turn order during a game", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "kick-turn-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "kick-turn-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );
    const kickedGuestJoin = roomRegistry.addPlayerToRoom(
      "kick-turn-room",
      "Kicked Guest",
      "kicked-guest-socket",
      "kicked-guest-session",
    );

    roomRegistry.startGame(
      "host-socket",
      { roomId: "kick-turn-room" },
      getTurnOrderDeck(),
    );

    roomRegistry.placeCard("host-socket", {
      roomId: "kick-turn-room",
      selectedSlotIndex: 1,
    });
    const secondTurnState = roomRegistry.confirmReveal("host-socket", {
      roomId: "kick-turn-room",
    });
    expect(secondTurnState.turn?.activePlayerId).toBe(guestJoin.playerId);

    const stateAfterKick = roomRegistry.kickPlayer("host-socket", {
      roomId: "kick-turn-room",
      playerId: kickedGuestJoin.playerId,
    }).roomState;

    expect(stateAfterKick.turn?.activePlayerId).toBe(guestJoin.playerId);
    expect(stateAfterKick.players.map((player) => player.id)).not.toContain(
      kickedGuestJoin.playerId,
    );

    roomRegistry.placeCard("guest-socket", {
      roomId: "kick-turn-room",
      selectedSlotIndex: 0,
    });
    const hostTurnState = roomRegistry.confirmReveal("host-socket", {
      roomId: "kick-turn-room",
    });

    expect(hostTurnState.turn?.activePlayerId).toBe(hostJoin.playerId);
    expect(hostTurnState.players.map((player) => player.id)).not.toContain(
      kickedGuestJoin.playerId,
    );
  });

  it("lets the host award TT during a game", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(guestSocket, "connect"),
    ]);

    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "award-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "award-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });

    const guestIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      guestSocket,
      ServerToClientEvent.PlayerIdentity,
    );

    await waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
    );

    const guestIdentity = await guestIdentityPromise;

    const firstTurnPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 1,
    );

    hostSocket.emit(ClientToServerEvent.StartGame, {
      roomId: "award-room",
    });

    await firstTurnPromise;

    const awardStatePromise = waitForStateUpdate(
      guestSocket,
      (roomState) =>
        roomState.players.find((player) => player.id === guestIdentity.playerId)
          ?.ttTokenCount === 1,
    );

    hostSocket.emit(ClientToServerEvent.AwardTt, {
      roomId: "award-room",
      playerId: guestIdentity.playerId,
      amount: 1,
    });

    const awardState = await awardStatePromise;

    expect(
      awardState.players.find((player) => player.id === guestIdentity.playerId)
        ?.ttTokenCount,
    ).toBe(1);
  });

  it("loads a curated playlist into the lobby deck", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    await waitForEvent(hostSocket, "connect");

    const identityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "curated-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    await identityPromise;

    const loadedTracksPromise = waitForEvent<PlaylistTracksPayload>(
      hostSocket,
      ServerToClientEvent.PlaylistTracks,
    );
    const importedStatePromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.settings.importedTrackCount === 659,
    );

    const largeCuratedPlaylist = Array.from({ length: 659 }, (_, index) => ({
      id: `curated-track-${index + 1}`,
      title: `Curated Song ${index + 1}`,
      artist: "Curated Artist",
      albumTitle: "Original Album",
      releaseYear: 1986,
      sourceReleaseYear: 2000,
      metadataStatus: "edited",
      spotifyTrackUri: `spotify:track:curated-track-${index + 1}`,
    }));

    hostSocket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
      roomId: "curated-room",
      tracks: largeCuratedPlaylist,
    });

    await expect(importedStatePromise).resolves.toEqual(
      expect.objectContaining({
        settings: expect.objectContaining({ importedTrackCount: 659 }),
      }),
    );
    const loadedTracks = await loadedTracksPromise;
    expect(loadedTracks.tracks).toHaveLength(659);
    expect(loadedTracks.tracks[0]).toEqual(
      expect.objectContaining({
        id: "curated-track-1",
        releaseYear: 1986,
        sourceReleaseYear: 2000,
        metadataStatus: "edited",
        spotifyTrackUri: "spotify:track:curated-track-1",
      }),
    );
    expect(loadedTracks.tracks[658]).toEqual(
      expect.objectContaining({
        id: "curated-track-659",
        spotifyTrackUri: "spotify:track:curated-track-659",
      }),
    );
  });

});

function createTestRoomService(): RoomService {
  const tokenStore = new SpotifyTokenStore();
  const apiClient = new SpotifyApiClient();
  return new RoomService(
    new RoomRegistry(undefined, 500, 25, 25),
    new TestDeckService(),
    new SpotifyAuthService(apiClient, tokenStore),
    new PlaylistImportService(apiClient, tokenStore),
  );
}

async function startTestServer(
  roomService = createTestRoomService(),
): Promise<TestServerContext> {
  const { httpServer } = createHttpServer();
  const io = createSocketServer(httpServer);

  registerSocketHandlers(io, roomService);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  const address = httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server to a local port.");
  }

  const close = async () => {
    await new Promise<void>((resolve) => {
      io.close(() => {
        resolve();
      });
    });
  };

  serverClosers.push(close);

  return {
    baseUrl: `http://localhost:${address.port}`,
    close,
  };
}


class TestDeckService extends DeckService {
  public override createShuffledDeck(): GameTrackCard[] {
    return getTurnOrderDeck();
  }
}

function getTurnOrderDeck(): GameTrackCard[] {
  return [
      {
        id: "test-track-1",
        title: "Older Song",
        artist: "Test Artist 1",
        albumTitle: "Test Album 1",
        genre: "Rock",
        releaseYear: 1980,
      },
      {
        id: "test-track-2",
        title: "Newer Song",
        artist: "Test Artist 2",
        albumTitle: "Test Album 2",
        genre: "Soul",
        releaseYear: 2000,
      },
      {
        id: "test-track-3",
        title: "Middle Song",
        artist: "Test Artist 3",
        albumTitle: "Test Album 3",
        genre: "Pop",
        releaseYear: 1990,
      },
      {
        id: "test-track-4",
        title: "Newest Song",
        artist: "Test Artist 4",
        albumTitle: "Test Album 4",
        genre: "Disco",
        releaseYear: 2010,
      },
      {
        id: "test-track-5",
        title: "Oldest Song",
        artist: "Test Artist 5",
        albumTitle: "Test Album 5",
        genre: "Funk",
        releaseYear: 1970,
      },
      {
        id: "test-track-6",
        title: "Future Song",
        artist: "Test Artist 6",
        albumTitle: "Test Album 6",
        genre: "House",
        releaseYear: 2020,
      },
    ];
}

function createClient(baseUrl: string): Socket {
  const socket = createSocketClient(baseUrl, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });

  sockets.push(socket);

  return socket;
}

function waitForEvent<TPayload>(
  socket: Socket,
  eventName: string,
): Promise<TPayload> {
  return new Promise((resolve) => {
    socket.once(eventName, (payload: TPayload) => {
      resolve(payload);
    });
  });
}

async function waitForStateUpdate(
  socket: Socket,
  isTargetState: (roomState: PublicRoomState) => boolean,
): Promise<PublicRoomState> {
  while (true) {
    const payload = await waitForEvent<StateUpdatePayload>(
      socket,
      ServerToClientEvent.StateUpdate,
    );

    if (isTargetState(payload.roomState)) {
      return payload.roomState;
    }
  }
}

