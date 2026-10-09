import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type ServerErrorPayload,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { describe, expect, it, vi } from "vitest";
import type { RoomService } from "../../src/rooms/RoomService.js";
import { turnOrderDeck } from "../support/decks.js";
import {
  createRoomAsHost,
  expectAppliedOnce,
  HOST,
  openTwoPlayerLobby,
  sendTwice,
  startGame,
} from "../support/roomFixtures.js";
import {
  connectTestClient,
  createTestRoomService,
  startSocketTestServer,
} from "../support/socketTestServer.js";
import { nextEvent, waitForStateUpdate } from "../support/waiters.js";

function createDealtRoomService(): RoomService {
  return createTestRoomService({ deck: turnOrderDeck() });
}

async function startTwoPlayerGame(roomService: RoomService, roomId: string) {
  const baseUrl = await startSocketTestServer(roomService);
  const seats = await openTwoPlayerLobby(baseUrl, roomId);
  await startGame(seats.host.socket, roomId, seats.guest.socket);
  return { baseUrl, ...seats };
}

async function expectError(socket: Socket, emit: () => void, error: ServerErrorPayload) {
  const errorPromise = nextEvent<ServerErrorPayload>(socket, ServerToClientEvent.Error);
  emit();
  await expect(errorPromise).resolves.toEqual(error);
}

describe("turn actions", () => {
  it("starts a game once when the start is replayed and hides the dealt card's year", async () => {
    const roomService = createDealtRoomService();
    const startGameSpy = vi.spyOn(roomService, "startGame");
    const { host } = await openTwoPlayerLobby(
      await startSocketTestServer(roomService),
      "game-room",
    );
    const turnPromise = waitForStateUpdate(host.socket, (state) => state.turn?.turnNumber === 1);

    const requestId = "00000000-0000-4000-8000-000000000100";
    const acks = await sendTwice(host.socket, ClientToServerEvent.StartGame, {
      roomId: "game-room",
      requestId,
    });

    const firstTurn = await turnPromise;
    expectAppliedOnce(acks, requestId, startGameSpy);
    expect(firstTurn.turn).toEqual({
      activePlayerId: host.playerId,
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    });
    expect(firstTurn.currentTrackCard).toEqual({
      id: "test-track-3",
      title: "Middle Song",
      artist: "Test Artist 3",
      albumTitle: "Test Album 3",
      genre: "Pop",
    });
    expect(firstTurn.timelines[host.playerId]).toEqual([
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
  });

  it("places a replayed card once and reveals it, refusing a player who is not on turn", async () => {
    const roomService = createDealtRoomService();
    const placeCardSpy = vi.spyOn(roomService, "placeCard");
    const { host, guest } = await startTwoPlayerGame(roomService, "game-room");
    await expectError(
      guest.socket,
      () =>
        guest.socket.emit(ClientToServerEvent.PlaceCard, {
          roomId: "game-room",
          selectedSlotIndex: 0,
        }),
      { code: "NOT_ACTIVE_PLAYER", message: "It is not your turn." },
    );
    placeCardSpy.mockClear();
    const revealPromise = waitForStateUpdate(guest.socket, (state) => state.status === "reveal");

    const requestId = "00000000-0000-4000-8000-000000000101";
    const acks = await sendTwice(host.socket, ClientToServerEvent.PlaceCard, {
      roomId: "game-room",
      selectedSlotIndex: 1,
      requestId,
    });

    const { revealState } = await revealPromise;
    expectAppliedOnce(acks, requestId, placeCardSpy);
    expect(revealState).toEqual({
      playerId: host.playerId,
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
      awardedPlayerId: host.playerId,
      awardedSlotIndex: 1,
    });
  });

  it("lets only the host confirm a reveal and advances the turn once when replayed", async () => {
    const roomService = createDealtRoomService();
    const confirmRevealSpy = vi.spyOn(roomService, "confirmReveal");
    const { host, guest } = await startTwoPlayerGame(roomService, "game-room");
    const revealPromise = waitForStateUpdate(guest.socket, (state) => state.status === "reveal");
    host.socket.emit(ClientToServerEvent.PlaceCard, { roomId: "game-room", selectedSlotIndex: 1 });
    await revealPromise;
    await expectError(
      guest.socket,
      () => guest.socket.emit(ClientToServerEvent.ConfirmReveal, { roomId: "game-room" }),
      { code: "ONLY_HOST_CAN_CONFIRM_REVEAL", message: "Only the host can confirm the reveal." },
    );
    confirmRevealSpy.mockClear();
    const secondTurnPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.turn?.turnNumber === 2,
    );

    const requestId = "00000000-0000-4000-8000-000000000102";
    const acks = await sendTwice(host.socket, ClientToServerEvent.ConfirmReveal, {
      roomId: "game-room",
      requestId,
    });

    const secondTurn = await secondTurnPromise;
    expectAppliedOnce(acks, requestId, confirmRevealSpy);
    expect(secondTurn.turn).toEqual({
      activePlayerId: guest.playerId,
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    });
    expect(secondTurn.currentTrackCard?.id).toBe("test-track-4");
    expect(secondTurn.revealState).toBeNull();
  });

  it("restores the same player identity after a refresh during an active game", async () => {
    const { baseUrl, host, guest } = await startTwoPlayerGame(
      createDealtRoomService(),
      "rejoin-room",
    );
    const transferredPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.hostId === guest.playerId,
    );
    host.socket.disconnect();
    const transferred = await transferredPromise;
    expect(transferred.players.find((player) => player.id === host.playerId)).toEqual(
      expect.objectContaining({ connectionStatus: "disconnected", isHost: false }),
    );

    const refreshed = await connectTestClient(baseUrl);
    const identityPromise = nextEvent<PlayerIdentityPayload>(
      refreshed,
      ServerToClientEvent.PlayerIdentity,
    );
    const statePromise = waitForStateUpdate(refreshed, (state) => state.status === "turn");
    refreshed.emit(ClientToServerEvent.JoinRoom, { roomId: "rejoin-room", ...HOST });

    await expect(identityPromise).resolves.toEqual({ playerId: host.playerId });
    const refreshedState = await statePromise;
    expect(refreshedState.hostId).toBe(guest.playerId);
    expect(refreshedState.players).toHaveLength(2);
    expect(refreshedState.players.find((player) => player.id === host.playerId)).toEqual(
      expect.objectContaining({ connectionStatus: "connected", isHost: false }),
    );
  });
});

describe("challenge actions", () => {
  async function startChallengeGame(roomService: RoomService) {
    const baseUrl = await startSocketTestServer(roomService);
    const seats = await openTwoPlayerLobby(baseUrl, "beat-room");
    const settingsPromise = waitForStateUpdate(
      seats.guest.socket,
      (state) => state.settings.ttModeEnabled,
    );
    seats.host.socket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "beat-room",
      startingTtTokenCount: 1,
      ttModeEnabled: true,
      challengeWindowDurationSeconds: null,
    });
    await settingsPromise;
    await startGame(seats.host.socket, "beat-room", seats.guest.socket);
    return seats;
  }

  async function placeAndOpenChallenge(placer: Socket, watcher: Socket) {
    const openPromise = waitForStateUpdate(
      watcher,
      (state) => state.challengeState?.phase === "open",
    );
    placer.emit(ClientToServerEvent.PlaceCard, { roomId: "beat-room", selectedSlotIndex: 0 });
    await openPromise;
  }

  it("resolves a replayed challenge window once", async () => {
    const roomService = createDealtRoomService();
    const resolveSpy = vi.spyOn(roomService, "resolveChallengeWindow");
    const { host, guest } = await startChallengeGame(roomService);
    await placeAndOpenChallenge(host.socket, guest.socket);
    const revealPromise = waitForStateUpdate(guest.socket, (state) => state.status === "reveal");

    const requestId = "00000000-0000-4000-8000-00000000010a";
    const acks = await sendTwice(host.socket, ClientToServerEvent.ResolveChallengeWindow, {
      roomId: "beat-room",
      requestId,
    });

    await revealPromise;
    expectAppliedOnce(acks, requestId, resolveSpy);
  });

  it("claims and places a replayed challenge once each", async () => {
    const roomService = createDealtRoomService();
    const claimSpy = vi.spyOn(roomService, "claimChallenge");
    const placeChallengeSpy = vi.spyOn(roomService, "placeChallenge");
    const { host, guest } = await startChallengeGame(roomService);
    await placeAndOpenChallenge(host.socket, guest.socket);
    const secondTurnPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.turn?.turnNumber === 2,
    );
    host.socket.emit(ClientToServerEvent.ResolveChallengeWindow, { roomId: "beat-room" });
    host.socket.emit(ClientToServerEvent.ConfirmReveal, { roomId: "beat-room" });
    await secondTurnPromise;
    await placeAndOpenChallenge(guest.socket, host.socket);

    const claimId = "00000000-0000-4000-8000-000000000103";
    const claimedPromise = waitForStateUpdate(
      guest.socket,
      (state) => state.challengeState?.challengerPlayerId === host.playerId,
    );
    const claimAcks = await sendTwice(host.socket, ClientToServerEvent.ClaimChallenge, {
      roomId: "beat-room",
      requestId: claimId,
    });
    await claimedPromise;
    expectAppliedOnce(claimAcks, claimId, claimSpy);

    const placeId = "00000000-0000-4000-8000-000000000104";
    const revealPromise = waitForStateUpdate(guest.socket, (state) => state.status === "reveal");
    const placeAcks = await sendTwice(host.socket, ClientToServerEvent.PlaceChallenge, {
      roomId: "beat-room",
      selectedSlotIndex: 1,
      requestId: placeId,
    });
    const { revealState } = await revealPromise;
    expectAppliedOnce(placeAcks, placeId, placeChallengeSpy);
    expect(revealState?.challengerPlayerId).toBe(host.playerId);
    expect(revealState?.playerId).toBe(guest.playerId);
  });
});

describe("token actions", () => {
  it("lets the host award TT once when the request is replayed", async () => {
    const roomService = createDealtRoomService();
    const awardTtSpy = vi.spyOn(roomService, "awardTt");
    const { host, guest } = await startTwoPlayerGame(roomService, "award-room");
    const guestTokens = (state: { players: Array<{ id: string; ttTokenCount: number }> }) =>
      state.players.find((player) => player.id === guest.playerId)?.ttTokenCount;
    const awardPromise = waitForStateUpdate(guest.socket, (state) => guestTokens(state) === 1);

    const requestId = "00000000-0000-4000-8000-000000000108";
    const acks = await sendTwice(host.socket, ClientToServerEvent.AwardTt, {
      roomId: "award-room",
      playerId: guest.playerId,
      amount: 1,
      requestId,
    });

    expect(guestTokens(await awardPromise)).toBe(1);
    expectAppliedOnce(acks, requestId, awardTtSpy);
  });

  it("applies replayed turn and token-spending actions once", async () => {
    const roomService = createDealtRoomService();
    const spies = {
      buy: vi.spyOn(roomService, "buyTimelineCardWithTt"),
      skipTrack: vi.spyOn(roomService, "skipTrackWithTt"),
      skipTurn: vi.spyOn(roomService, "skipTurn"),
    };
    const host = await createRoomAsHost(await startSocketTestServer(roomService), "buy-room");
    const hostTokens = (state: { players: Array<{ id: string; ttTokenCount: number }> }) =>
      state.players.find((player) => player.id === host.playerId)?.ttTokenCount;
    const settingsPromise = waitForStateUpdate(host.socket, (state) => hostTokens(state) === 4);
    host.socket.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: "buy-room",
      startingTtTokenCount: 4,
      ttModeEnabled: true,
    });
    await settingsPromise;
    await startGame(host.socket, "buy-room");

    const skipTurnId = "00000000-0000-4000-8000-000000000109";
    const secondTurnPromise = waitForStateUpdate(
      host.socket,
      (state) => state.turn?.turnNumber === 2,
    );
    const skipTurnAcks = await sendTwice(host.socket, ClientToServerEvent.SkipTurn, {
      roomId: "buy-room",
      requestId: skipTurnId,
    });
    const secondTurn = await secondTurnPromise;
    expectAppliedOnce(skipTurnAcks, skipTurnId, spies.skipTurn);

    const skipTrackId = "00000000-0000-4000-8000-000000000107";
    const skippedPromise = waitForStateUpdate(
      host.socket,
      (state) =>
        state.turn?.hasUsedSkipTrackWithTt === true &&
        state.currentTrackCard?.id !== secondTurn.currentTrackCard?.id,
    );
    const skipTrackAcks = await sendTwice(host.socket, ClientToServerEvent.SkipTrackWithTt, {
      roomId: "buy-room",
      requestId: skipTrackId,
    });
    expect(hostTokens(await skippedPromise)).toBe(3);
    expectAppliedOnce(skipTrackAcks, skipTrackId, spies.skipTrack);

    const buyId = "00000000-0000-4000-8000-000000000106";
    const boughtPromise = waitForStateUpdate(
      host.socket,
      (state) => state.revealState?.revealType === "tt_buy",
    );
    const buyAcks = await sendTwice(host.socket, ClientToServerEvent.BuyTimelineCardWithTt, {
      roomId: "buy-room",
      requestId: buyId,
    });
    const bought = await boughtPromise;
    expectAppliedOnce(buyAcks, buyId, spies.buy);
    expect(hostTokens(bought)).toBe(0);
    expect(bought.timelines[host.playerId]).toHaveLength(2);
  });
});
