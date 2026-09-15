import type { GameTrackCard } from "@tunetrack/game-engine";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ActionAck,
  type PlayerIdentityPayload,
  type PlaylistTracksPayload,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { SpotifyDiscoveryService } from "../src/spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../src/spotify/SpotifyMusicSearchService.js";
import { SpotifyPlaybackSessionStore } from "../src/spotify/SpotifyPlaybackSessionStore.js";
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
            player.id === hostIdentity.playerId && player.connectionStatus === "disconnected",
        ),
    );

    hostSocket.disconnect();

    const roomAfterHostDisconnect = await hostDisconnectedPromise;
    expect(roomAfterHostDisconnect.players).toHaveLength(2);
    expect(roomAfterHostDisconnect.hostId).toBe(hostIdentity.playerId);
    expect(
      roomAfterHostDisconnect.players.find((player) => player.id === hostIdentity.playerId),
    ).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isHost: true,
      }),
    );
    expect(
      roomAfterHostDisconnect.players.find((player) => player.id === guestIdentity.playerId),
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

    await Promise.all([waitForEvent(hostSocket, "connect"), waitForEvent(guestSocket, "connect")]);

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
    expect(guestRenamedState.players.map((player) => player.id)).toContain(guestIdentity.playerId);

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
            player.id === guestIdentity.playerId && player.connectionStatus === "connected",
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
    expect(roomRegistry.getRoomStateForMember("host-socket", "room-a").players).toEqual([
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

  it("keeps a reconnected player online when their stale socket later disconnects", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "reconnect-room",
      "Host Player",
      "host-socket-old",
      "host-session",
    );
    roomRegistry.addPlayerToRoom("reconnect-room", "Guest Player", "guest-socket", "guest-session");

    roomRegistry.addPlayerToRoom("reconnect-room", "Host Player", "host-socket-new", "host-session");

    const staleDisconnectState = roomRegistry.removePlayerBySocketId("host-socket-old");
    expect(staleDisconnectState).toBeNull();

    const roomState = roomRegistry.getRoomStateForMember("host-socket-new", "reconnect-room");
    expect(roomState.players.find((player) => player.id === hostJoin.playerId)).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: true,
      }),
    );
  });

  it("still marks a player disconnected when their only socket drops", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "solo-drop-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    const guestJoin = roomRegistry.addPlayerToRoom(
      "solo-drop-room",
      "Guest Player",
      "guest-socket",
      "guest-session",
    );

    const roomState = roomRegistry.removePlayerBySocketId("guest-socket");

    expect(roomState).not.toBeNull();
    expect(roomState?.players.find((player) => player.id === guestJoin.playerId)).toEqual(
      expect.objectContaining({ connectionStatus: "disconnected" }),
    );
    expect(roomState?.hostId).toBe(hostJoin.playerId);
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

    const errorPromise = waitForEvent<ServerErrorPayload>(extraSocket, ServerToClientEvent.Error);

    extraSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "room-6",
      displayName: "Extra Player",
      sessionId: "session-6",
    });

    await expect(errorPromise).resolves.toEqual({
      code: "ROOM_LIMIT_REACHED",
      message: "The room limit has been reached. Close a room before creating a new one.",
    });
  });

  it("lets the host manually transfer host controls to another connected player", async () => {
    const roomService = createTestRoomService();
    const transferHostSpy = vi.spyOn(roomService, "transferHost");
    const serverContext = await startTestServer(roomService);
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

    await Promise.all([waitForEvent(hostSocket, "connect"), waitForEvent(guestSocket, "connect")]);

    const twoPlayerLobbyPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
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

    const requestId = "00000000-0000-4000-8000-00000000010b";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.TransferHost, {
        roomId: "xfer-room",
        playerId: guestIdentity.playerId,
        requestId,
      }) as Promise<ActionAck>;

    const [transferredState, firstAck] = await Promise.all([
      transferredStatePromise,
      firstAckPromise,
    ]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.TransferHost, {
        roomId: "xfer-room",
        playerId: guestIdentity.playerId,
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(transferHostSpy).toHaveBeenCalledTimes(1);

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

  it("starts a game, applies a replayed placement once, resolves reveal, and advances turn", async () => {
    const roomService = createTestRoomService();
    const startGameSpy = vi.spyOn(roomService, "startGame");
    const placeCardSpy = vi.spyOn(roomService, "placeCard");
    const confirmRevealSpy = vi.spyOn(roomService, "confirmReveal");
    const serverContext = await startTestServer(roomService);
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

    const startRequestId = "00000000-0000-4000-8000-000000000100";
    const firstStartAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.StartGame, {
        roomId: "game-room",
        requestId: startRequestId,
      }) as Promise<ActionAck>;

    const [firstTurnState, firstStartAck] = await Promise.all([
      gameTurnPromise,
      firstStartAckPromise,
    ]);
    const replayStartAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.StartGame, {
        roomId: "game-room",
        requestId: startRequestId,
      })) as ActionAck;

    expect(firstStartAck).toEqual({ ok: true, requestId: startRequestId });
    expect(replayStartAck).toEqual(firstStartAck);
    expect(startGameSpy).toHaveBeenCalledTimes(1);

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
    });
    expect(firstTurnState.currentTrackCard).not.toHaveProperty("releaseYear");
    expect(firstTurnState.currentTrackCard).not.toHaveProperty("sourceReleaseYear");
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
    placeCardSpy.mockClear();

    const revealStatePromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "reveal",
    );

    const requestId = "00000000-0000-4000-8000-000000000101";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.PlaceCard, {
        roomId: "game-room",
        selectedSlotIndex: 1,
        requestId,
      }) as Promise<ActionAck>;

    const [revealState, firstAck] = await Promise.all([
      revealStatePromise,
      firstAckPromise,
    ]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.PlaceCard, {
        roomId: "game-room",
        selectedSlotIndex: 1,
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(placeCardSpy).toHaveBeenCalledTimes(1);

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
    confirmRevealSpy.mockClear();

    const secondTurnPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 2,
    );

    const confirmRevealRequestId = "00000000-0000-4000-8000-000000000102";
    const firstConfirmRevealAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ConfirmReveal, {
        roomId: "game-room",
        requestId: confirmRevealRequestId,
      }) as Promise<ActionAck>;

    const [secondTurnState, firstConfirmRevealAck] = await Promise.all([
      secondTurnPromise,
      firstConfirmRevealAckPromise,
    ]);
    const replayConfirmRevealAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ConfirmReveal, {
        roomId: "game-room",
        requestId: confirmRevealRequestId,
      })) as ActionAck;

    expect(firstConfirmRevealAck).toEqual({
      ok: true,
      requestId: confirmRevealRequestId,
    });
    expect(replayConfirmRevealAck).toEqual(firstConfirmRevealAck);
    expect(confirmRevealSpy).toHaveBeenCalledTimes(1);

    expect(secondTurnState.turn).toEqual({
      activePlayerId: guestIdentity.playerId,
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    });
    expect(secondTurnState.currentTrackCard?.id).toBe("test-track-4");
    expect(secondTurnState.revealState).toBeNull();
  });

  it("applies replayed challenge actions once", async () => {
    const roomService = createTestRoomService();
    const claimChallengeSpy = vi.spyOn(roomService, "claimChallenge");
    const placeChallengeSpy = vi.spyOn(roomService, "placeChallenge");
    const resolveChallengeWindowSpy = vi.spyOn(
      roomService,
      "resolveChallengeWindow",
    );
    const serverContext = await startTestServer(roomService);
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
      roomId: "beat-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    guestSocket.emit(ClientToServerEvent.JoinRoom, {
      roomId: "beat-room",
      displayName: "Guest Player",
      sessionId: "guest-session",
    });
    const [hostIdentity, guestIdentity] = await Promise.all([
      hostIdentityPromise,
      guestIdentityPromise,
      waitForStateUpdate(
        guestSocket,
        (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
      ),
    ]);

    const settingsPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.settings.ttModeEnabled,
    );
    hostSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "beat-room",
      startingTtTokenCount: 1,
      ttModeEnabled: true,
      challengeWindowDurationSeconds: null,
    });
    await settingsPromise;

    const turnPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "turn",
    );
    hostSocket.emit(ClientToServerEvent.StartGame, { roomId: "beat-room" });
    await turnPromise;

    const openChallengePromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.challengeState?.phase === "open",
    );
    hostSocket.emit(ClientToServerEvent.PlaceCard, {
      roomId: "beat-room",
      selectedSlotIndex: 0,
    });
    await openChallengePromise;

    const firstRevealPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "reveal",
    );
    const resolveRequestId = "00000000-0000-4000-8000-00000000010a";
    const firstResolveAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ResolveChallengeWindow, {
        roomId: "beat-room",
        requestId: resolveRequestId,
      }) as Promise<ActionAck>;
    const [, firstResolveAck] = await Promise.all([
      firstRevealPromise,
      firstResolveAckPromise,
    ]);
    const replayResolveAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ResolveChallengeWindow, {
        roomId: "beat-room",
        requestId: resolveRequestId,
      })) as ActionAck;

    expect(firstResolveAck).toEqual({ ok: true, requestId: resolveRequestId });
    expect(replayResolveAck).toEqual(firstResolveAck);
    expect(resolveChallengeWindowSpy).toHaveBeenCalledTimes(1);

    const secondTurnPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "turn" && roomState.turn?.turnNumber === 2,
    );
    hostSocket.emit(ClientToServerEvent.ConfirmReveal, { roomId: "beat-room" });
    await secondTurnPromise;

    const secondOpenChallengePromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.challengeState?.phase === "open",
    );
    guestSocket.emit(ClientToServerEvent.PlaceCard, {
      roomId: "beat-room",
      selectedSlotIndex: 0,
    });
    await secondOpenChallengePromise;

    const claimedChallengePromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.challengeState?.challengerPlayerId === hostIdentity.playerId,
    );
    const claimRequestId = "00000000-0000-4000-8000-000000000103";
    const firstClaimAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ClaimChallenge, {
        roomId: "beat-room",
        requestId: claimRequestId,
      }) as Promise<ActionAck>;
    const [, firstClaimAck] = await Promise.all([
      claimedChallengePromise,
      firstClaimAckPromise,
    ]);
    const replayClaimAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.ClaimChallenge, {
        roomId: "beat-room",
        requestId: claimRequestId,
      })) as ActionAck;

    expect(firstClaimAck).toEqual({ ok: true, requestId: claimRequestId });
    expect(replayClaimAck).toEqual(firstClaimAck);
    expect(claimChallengeSpy).toHaveBeenCalledTimes(1);
    placeChallengeSpy.mockClear();

    const revealPromise = waitForStateUpdate(
      guestSocket,
      (roomState) => roomState.status === "reveal",
    );
    const requestId = "00000000-0000-4000-8000-000000000104";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.PlaceChallenge, {
        roomId: "beat-room",
        selectedSlotIndex: 1,
        requestId,
      }) as Promise<ActionAck>;
    const [revealState, firstAck] = await Promise.all([revealPromise, firstAckPromise]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.PlaceChallenge, {
        roomId: "beat-room",
        selectedSlotIndex: 1,
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(placeChallengeSpy).toHaveBeenCalledTimes(1);
    expect(revealState.revealState?.challengerPlayerId).toBe(hostIdentity.playerId);
    expect(revealState.revealState?.playerId).toBe(guestIdentity.playerId);
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
        (roomState) => roomState.status === "lobby" && roomState.players.length === 2,
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
      transferredHostState.players.find((player) => player.id === hostIdentity.playerId),
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
    expect(refreshedState.players.find((player) => player.id === hostIdentity.playerId)).toEqual(
      expect.objectContaining({
        connectionStatus: "connected",
        isHost: false,
      }),
    );
    expect(refreshedState.status).toBe("turn");
  });

  it("lets the host close the room for everyone", async () => {
    const roomService = createTestRoomService();
    const closeRoomSpy = vi.spyOn(roomService, "closeRoom");
    const serverContext = await startTestServer(roomService);
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([waitForEvent(hostSocket, "connect"), waitForEvent(guestSocket, "connect")]);

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

    const requestId = "00000000-0000-4000-8000-000000000105";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.CloseRoom, {
        roomId: "close-room",
        requestId,
      }) as Promise<ActionAck>;

    const [roomClosed, firstAck] = await Promise.all([
      roomClosedPromise,
      firstAckPromise,
    ]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.CloseRoom, {
        roomId: "close-room",
        requestId,
      })) as ActionAck;

    expect(roomClosed).toEqual({
      roomId: "close-room",
      message: "The host closed this room.",
    });
    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(closeRoomSpy).toHaveBeenCalledTimes(1);
  });

  it("notifies a kicked player so their client can leave the room", async () => {
    const roomService = createTestRoomService();
    const kickPlayerSpy = vi.spyOn(roomService, "kickPlayer");
    const serverContext = await startTestServer(roomService);
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([waitForEvent(hostSocket, "connect"), waitForEvent(guestSocket, "connect")]);

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

    const kickedNotificationSpy = vi.fn();
    guestSocket.on(ServerToClientEvent.RoomClosed, kickedNotificationSpy);
    const kickedPromise = waitForEvent<{
      roomId: string;
      message: string;
      reason: string;
      roomName: string;
    }>(
      guestSocket,
      ServerToClientEvent.RoomClosed,
    );
    const hostStatePromise = waitForStateUpdate(
      hostSocket,
      (roomState) =>
        roomState.roomId === "kick-room" &&
        !roomState.players.some((player) => player.id === guestIdentity.playerId),
    );

    const requestId = "00000000-0000-4000-8000-00000000010c";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.KickPlayer, {
        roomId: "kick-room",
        playerId: guestIdentity.playerId,
        requestId,
      }) as Promise<ActionAck>;

    await expect(kickedPromise).resolves.toEqual({
      roomId: "kick-room",
      reason: "kicked",
      roomName: "kick-room",
      message: "You were removed from this room.",
    });
    await expect(hostStatePromise).resolves.toEqual(
      expect.objectContaining({ roomId: "kick-room" }),
    );
    const firstAck = await firstAckPromise;
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.KickPlayer, {
        roomId: "kick-room",
        playerId: guestIdentity.playerId,
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(kickPlayerSpy).toHaveBeenCalledTimes(1);
    expect(kickedNotificationSpy).toHaveBeenCalledTimes(1);
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

    roomRegistry.startGame("host-socket", { roomId: "kick-turn-room" }, getTurnOrderDeck());

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

  it("skips a manual host skip over a disconnected player to the next connected one", () => {
    const roomRegistry = new RoomRegistry();
    const hostJoin = roomRegistry.createRoom(
      "skip-room",
      "Host Player",
      "host-socket",
      "host-session",
    );
    roomRegistry.addPlayerToRoom("skip-room", "Guest Player", "guest-socket", "guest-session");
    const thirdJoin = roomRegistry.addPlayerToRoom(
      "skip-room",
      "Third Player",
      "third-socket",
      "third-session",
    );

    roomRegistry.startGame("host-socket", { roomId: "skip-room" }, getTurnOrderDeck());
    expect(roomRegistry.getRoomStateForMember("host-socket", "skip-room").turn?.activePlayerId).toBe(
      hostJoin.playerId,
    );

    roomRegistry.removePlayerBySocketId("guest-socket");

    const stateAfterSkip = roomRegistry.skipTurn("host-socket", { roomId: "skip-room" });

    expect(stateAfterSkip.turn?.activePlayerId).toBe(thirdJoin.playerId);
  });

  it("lets the host award TT once when the request is replayed", async () => {
    const roomService = createTestRoomService();
    const awardTtSpy = vi.spyOn(roomService, "awardTt");
    const serverContext = await startTestServer(roomService);
    const hostSocket = createClient(serverContext.baseUrl);
    const guestSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    guestSocket.connect();

    await Promise.all([waitForEvent(hostSocket, "connect"), waitForEvent(guestSocket, "connect")]);

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
        roomState.players.find((player) => player.id === guestIdentity.playerId)?.ttTokenCount ===
        1,
    );

    const requestId = "00000000-0000-4000-8000-000000000108";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.AwardTt, {
        roomId: "award-room",
        playerId: guestIdentity.playerId,
        amount: 1,
        requestId,
      }) as Promise<ActionAck>;

    const [awardState, firstAck] = await Promise.all([awardStatePromise, firstAckPromise]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.AwardTt, {
        roomId: "award-room",
        playerId: guestIdentity.playerId,
        amount: 1,
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(awardTtSpy).toHaveBeenCalledTimes(1);
    expect(
      awardState.players.find((player) => player.id === guestIdentity.playerId)?.ttTokenCount,
    ).toBe(1);
  });

  it("applies replayed turn and token-spending actions once", async () => {
    const roomService = createTestRoomService();
    const buyTimelineCardSpy = vi.spyOn(roomService, "buyTimelineCardWithTt");
    const skipTrackSpy = vi.spyOn(roomService, "skipTrackWithTt");
    const skipTurnSpy = vi.spyOn(roomService, "skipTurn");
    const serverContext = await startTestServer(roomService);
    const hostSocket = createClient(serverContext.baseUrl);

    const connectionPromise = waitForEvent(hostSocket, "connect");
    hostSocket.connect();
    await connectionPromise;

    const hostIdentityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "buy-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    const hostIdentity = await hostIdentityPromise;

    const settingsPromise = waitForStateUpdate(
      hostSocket,
      (roomState) =>
        roomState.settings.ttModeEnabled && roomState.players[0]?.ttTokenCount === 4,
    );
    hostSocket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "buy-room",
      startingTtTokenCount: 4,
      ttModeEnabled: true,
    });
    await settingsPromise;

    const turnPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.status === "turn",
    );
    hostSocket.emit(ClientToServerEvent.StartGame, { roomId: "buy-room" });
    const turnState = await turnPromise;

    const nextTurnPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.turn?.turnNumber === (turnState.turn?.turnNumber ?? 0) + 1,
    );
    const skipTurnRequestId = "00000000-0000-4000-8000-000000000109";
    const firstSkipTurnAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.SkipTurn, {
        roomId: "buy-room",
        requestId: skipTurnRequestId,
      }) as Promise<ActionAck>;
    const [nextTurnState, firstSkipTurnAck] = await Promise.all([
      nextTurnPromise,
      firstSkipTurnAckPromise,
    ]);
    const replaySkipTurnAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.SkipTurn, {
        roomId: "buy-room",
        requestId: skipTurnRequestId,
      })) as ActionAck;

    expect(firstSkipTurnAck).toEqual({ ok: true, requestId: skipTurnRequestId });
    expect(replaySkipTurnAck).toEqual(firstSkipTurnAck);
    expect(skipTurnSpy).toHaveBeenCalledTimes(1);

    const skippedTrackPromise = waitForStateUpdate(
      hostSocket,
      (roomState) =>
        roomState.currentTrackCard?.id !== nextTurnState.currentTrackCard?.id &&
        roomState.turn?.hasUsedSkipTrackWithTt === true,
    );
    const skipRequestId = "00000000-0000-4000-8000-000000000107";
    const firstSkipAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.SkipTrackWithTt, {
        roomId: "buy-room",
        requestId: skipRequestId,
      }) as Promise<ActionAck>;

    const [skippedTrackState, firstSkipAck] = await Promise.all([
      skippedTrackPromise,
      firstSkipAckPromise,
    ]);
    const replaySkipAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.SkipTrackWithTt, {
        roomId: "buy-room",
        requestId: skipRequestId,
      })) as ActionAck;

    expect(firstSkipAck).toEqual({ ok: true, requestId: skipRequestId });
    expect(replaySkipAck).toEqual(firstSkipAck);
    expect(skipTrackSpy).toHaveBeenCalledTimes(1);
    expect(
      skippedTrackState.players.find((player) => player.id === hostIdentity.playerId)
        ?.ttTokenCount,
    ).toBe(3);

    const revealPromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.revealState?.revealType === "tt_buy",
    );
    const requestId = "00000000-0000-4000-8000-000000000106";
    const firstAckPromise = hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.BuyTimelineCardWithTt, {
        roomId: "buy-room",
        requestId,
      }) as Promise<ActionAck>;

    const [revealState, firstAck] = await Promise.all([revealPromise, firstAckPromise]);
    const replayAck = (await hostSocket
      .timeout(1_000)
      .emitWithAck(ClientToServerEvent.BuyTimelineCardWithTt, {
        roomId: "buy-room",
        requestId,
      })) as ActionAck;

    expect(firstAck).toEqual({ ok: true, requestId });
    expect(replayAck).toEqual(firstAck);
    expect(buyTimelineCardSpy).toHaveBeenCalledTimes(1);
    expect(
      revealState.players.find((player) => player.id === hostIdentity.playerId)?.ttTokenCount,
    ).toBe(0);
    expect(revealState.timelines[hostIdentity.playerId]).toHaveLength(2);
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

  it("appends curated tracks to the current lobby deck and dedupes duplicates", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    await waitForEvent(hostSocket, "connect");

    const identityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "append-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    await identityPromise;

    const firstTracksPromise = waitForEvent<PlaylistTracksPayload>(
      hostSocket,
      ServerToClientEvent.PlaylistTracks,
    );

    hostSocket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
      roomId: "append-room",
      tracks: [
        buildCuratedTrack("track-1", "First Song", "spotify:track:one"),
        buildCuratedTrack("track-2", "Second Song", "spotify:track:two"),
      ],
      mode: "replace",
    });

    await expect(firstTracksPromise).resolves.toEqual({
      tracks: [
        expect.objectContaining({ id: "track-1", spotifyTrackUri: "spotify:track:one" }),
        expect.objectContaining({ id: "track-2", spotifyTrackUri: "spotify:track:two" }),
      ],
    });

    const appendedTracksPromise = waitForEvent<PlaylistTracksPayload>(
      hostSocket,
      ServerToClientEvent.PlaylistTracks,
    );
    const appendedStatePromise = waitForStateUpdate(
      hostSocket,
      (roomState) => roomState.settings.importedTrackCount === 3,
    );

    hostSocket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
      roomId: "append-room",
      tracks: [
        buildCuratedTrack("track-2-copy", "Second Song", "spotify:track:two"),
        buildCuratedTrack("track-3", "Third Song", "spotify:track:three"),
      ],
      mode: "append",
    });

    await expect(appendedStatePromise).resolves.toEqual(
      expect.objectContaining({
        settings: expect.objectContaining({ importedTrackCount: 3 }),
      }),
    );
    const appendedTracks = await appendedTracksPromise;
    expect(appendedTracks.tracks.map((track) => track.spotifyTrackUri)).toEqual([
      "spotify:track:one",
      "spotify:track:two",
      "spotify:track:three",
    ]);
  });

  it("dedupes duplicate tracks when replacing the lobby deck", async () => {
    const serverContext = await startTestServer();
    const hostSocket = createClient(serverContext.baseUrl);

    hostSocket.connect();
    await waitForEvent(hostSocket, "connect");

    const identityPromise = waitForEvent<PlayerIdentityPayload>(
      hostSocket,
      ServerToClientEvent.PlayerIdentity,
    );
    hostSocket.emit(ClientToServerEvent.CreateRoom, {
      roomId: "dedupe-room",
      displayName: "Host Player",
      sessionId: "host-session",
    });
    await identityPromise;

    const tracksPromise = waitForEvent<PlaylistTracksPayload>(
      hostSocket,
      ServerToClientEvent.PlaylistTracks,
    );

    hostSocket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
      roomId: "dedupe-room",
      tracks: [
        buildCuratedTrack("track-1", "First Song", "spotify:track:one"),
        buildCuratedTrack("track-1-dup", "First Song Again", "spotify:track:one"),
        buildCuratedTrack("track-2", "Second Song", "spotify:track:two"),
      ],
      mode: "replace",
    });

    const tracksPayload = await tracksPromise;
    expect(tracksPayload.tracks).toHaveLength(2);
    expect(tracksPayload.tracks.map((track) => track.spotifyTrackUri)).toEqual([
      "spotify:track:one",
      "spotify:track:two",
    ]);
  });
});

describe("refresh_spotify_token authorization", () => {
  it("defers instead of erroring when the socket has no room membership yet (reconnect race)", async () => {
    const roomService = createTestRoomService();

    const result = await roomService.refreshSpotifyToken(
      { roomId: "reconnect-room" },
      "socket-without-membership",
    );

    expect(result).toEqual({ status: "deferred" });
  });
});

function buildCuratedTrack(id: string, title: string, spotifyTrackUri: string) {
  return {
    id,
    title,
    artist: "Curated Artist",
    albumTitle: "Original Album",
    releaseYear: 1986,
    metadataStatus: "imported",
    spotifyTrackUri,
  };
}

function createTestRoomService(): RoomService {
  const tokenStore = new SpotifyTokenStore();
  const apiClient = new SpotifyApiClient();
  return new RoomService(
    new RoomRegistry(undefined, 500, 25, 25),
    new TestDeckService(),
    new SpotifyAuthService(apiClient, tokenStore),
    new PlaylistImportService(apiClient, tokenStore),
    new SpotifyDiscoveryService(apiClient, tokenStore),
    new SpotifyMusicSearchService(apiClient, tokenStore),
    new SpotifyPlaybackSessionStore(),
  );
}

async function startTestServer(roomService = createTestRoomService()): Promise<TestServerContext> {
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

function waitForEvent<TPayload>(socket: Socket, eventName: string): Promise<TPayload> {
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
    const payload = await waitForEvent<StateUpdatePayload>(socket, ServerToClientEvent.StateUpdate);

    if (isTargetState(payload.roomState)) {
      return payload.roomState;
    }
  }
}
