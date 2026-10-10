import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ClientToServerEventName,
  type ServerErrorPayload,
  type SpotifyPlaybackResultPayload,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { describe, expect, it, vi } from "vitest";
import { turnOrderDeck } from "../support/decks.js";
import { emitWithAck, openTwoPlayerLobby, startGame } from "../support/roomFixtures.js";
import {
  connectTestClient,
  createSocketTestServices,
  startSocketTestServer,
} from "../support/socketTestServer.js";
import { nextEvent } from "../support/waiters.js";

/**
 * Every client event, sent with a valid payload by a caller who may not perform it, is refused
 * with its own code and leaves the room exactly as it was (06 T6). The cases run over the real
 * Socket.IO server, so a handler that skips its membership, host or phase check fails here.
 */
const ROOM_ID = "TEST_ROOM_1";
const REQUEST_ID = "12345678-1234-4234-8234-123456789012";
const TEN_TRACK_IDS = Array.from({ length: 10 }, (_, index) => `track-${index}`);

type Event = ClientToServerEventName;
type RoomSeats = Awaited<ReturnType<typeof openRoom>>;

/** Events anyone may send before joining a room; they carry no room authority. */
const PUBLIC_EVENTS: Event[] = [
  ClientToServerEvent.CreateRoom,
  ClientToServerEvent.JoinRoom,
  ClientToServerEvent.GetRoomPreview,
  ClientToServerEvent.ListRooms,
];

/** Refused on their own result event instead of the ack; covered by the last block. */
const RESULT_EVENT_REFUSALS: Event[] = [
  ClientToServerEvent.RefreshSpotifyToken,
  ClientToServerEvent.PlaySpotifyTrack,
  ClientToServerEvent.UnregisterSpotifyPlaybackDevice,
];

const HOST_ONLY_IN_LOBBY: Array<[Event, string]> = [
  [ClientToServerEvent.AwardTt, "ONLY_HOST_CAN_AWARD_TT"],
  [ClientToServerEvent.CloseRoom, "ONLY_HOST_CAN_CLOSE_ROOM"],
  [ClientToServerEvent.GenerateSpotifyCandidates, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.GetPlaylistTracks, "ONLY_HOST_CAN_EDIT_PLAYLIST"],
  [ClientToServerEvent.ImportPlaylist, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.KickPlayer, "ONLY_HOST_CAN_KICK_PLAYER"],
  [ClientToServerEvent.LoadCuratedPlaylist, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.OpenSpotifyPlaylist, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.RegisterSpotifyPlaybackDevice, "ONLY_SPOTIFY_PLAYBACK_OWNER_CAN_CONTROL"],
  [ClientToServerEvent.RemovePlaylistTracks, "ONLY_HOST_CAN_EDIT_PLAYLIST"],
  [ClientToServerEvent.RenameRoom, "ONLY_HOST_CAN_RENAME_ROOM"],
  [ClientToServerEvent.RequestSpotifyAuthUrl, "ONLY_HOST_CAN_CONTROL_SPOTIFY_PLAYBACK"],
  [ClientToServerEvent.SearchSpotifyMusic, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.SearchSpotifyPlaylists, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
  [ClientToServerEvent.StartGame, "ONLY_HOST_CAN_START_GAME"],
  [ClientToServerEvent.TransferHost, "ONLY_HOST_CAN_TRANSFER_HOST"],
  [ClientToServerEvent.UpdatePlayerSettings, "ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS"],
  [ClientToServerEvent.UpdatePlaylistTrack, "ONLY_HOST_CAN_EDIT_PLAYLIST"],
  [ClientToServerEvent.UpdateRoomSettings, "ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS"],
  [ClientToServerEvent.UseSpotifyCandidates, "ONLY_HOST_CAN_IMPORT_PLAYLIST"],
];

const HOST_ONLY_IN_GAME: Array<[Event, string]> = [
  [ClientToServerEvent.ConfirmReveal, "ONLY_HOST_CAN_CONFIRM_REVEAL"],
  [ClientToServerEvent.ResolveChallengeWindow, "ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW"],
  [ClientToServerEvent.SkipTurn, "ONLY_HOST_CAN_SKIP_TURN"],
];

const ACTIVE_PLAYER_ONLY: Array<[Event, string]> = [
  [ClientToServerEvent.PlaceCard, "NOT_ACTIVE_PLAYER"],
  [ClientToServerEvent.SkipTrackWithTt, "NOT_ACTIVE_PLAYER"],
  [ClientToServerEvent.BuyTimelineCardWithTt, "NOT_ACTIVE_PLAYER"],
];

const GAMEPLAY_BEFORE_START: Array<[Event, string]> = [
  [ClientToServerEvent.ClaimChallenge, "GAME_NOT_STARTED"],
  [ClientToServerEvent.ConfirmReveal, "GAME_NOT_STARTED"],
  [ClientToServerEvent.PlaceCard, "GAME_NOT_STARTED"],
  [ClientToServerEvent.PlaceChallenge, "GAME_NOT_STARTED"],
  [ClientToServerEvent.ResolveChallengeWindow, "GAME_NOT_STARTED"],
  [ClientToServerEvent.SkipTurn, "GAME_NOT_STARTED"],
];

const SETUP_AFTER_START: Array<[Event, string]> = [
  [ClientToServerEvent.ClaimChallenge, "GAME_NOT_IN_CHALLENGE_PHASE"],
  [ClientToServerEvent.ConfirmReveal, "GAME_NOT_IN_REVEAL_PHASE"],
  [ClientToServerEvent.GenerateSpotifyCandidates, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.GetPlaylistTracks, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.ImportPlaylist, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.LoadCuratedPlaylist, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.OpenSpotifyPlaylist, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.PlaceChallenge, "GAME_NOT_IN_CHALLENGE_PHASE"],
  [ClientToServerEvent.RemovePlaylistTracks, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.RenameRoom, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.ResolveChallengeWindow, "GAME_NOT_IN_CHALLENGE_PHASE"],
  [ClientToServerEvent.SearchSpotifyMusic, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.SearchSpotifyPlaylists, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.StartGame, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.UpdatePlayerProfile, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.UpdatePlaylistTrack, "GAME_ALREADY_STARTED"],
  [ClientToServerEvent.UseSpotifyCandidates, "GAME_ALREADY_STARTED"],
];

const ROOM_EVENTS = Object.values(ClientToServerEvent).filter(
  (event) => !PUBLIC_EVENTS.includes(event) && !RESULT_EVENT_REFUSALS.includes(event),
);

function validPayload(event: Event, targetPlayerId: string): object {
  const room = { roomId: ROOM_ID };
  const device = { ...room, deviceId: "TEST_DEVICE_1", playbackGeneration: 0 };
  switch (event) {
    case ClientToServerEvent.PlaceCard:
    case ClientToServerEvent.PlaceChallenge:
      return { ...room, selectedSlotIndex: 0 };
    case ClientToServerEvent.RenameRoom:
      return { ...room, nextRoomId: "TEST_ROOM_2", requestId: REQUEST_ID };
    case ClientToServerEvent.UpdatePlayerSettings:
      return {
        ...room,
        playerId: targetPlayerId,
        startingTimelineCardCount: 2,
        startingTtTokenCount: 1,
      };
    case ClientToServerEvent.UpdatePlayerProfile:
      return { ...room, displayName: "Player One" };
    case ClientToServerEvent.AwardTt:
      return { ...room, playerId: targetPlayerId, amount: 1 };
    case ClientToServerEvent.TransferHost:
    case ClientToServerEvent.KickPlayer:
      return { ...room, playerId: targetPlayerId };
    case ClientToServerEvent.ImportPlaylist:
      return { ...room, playlistUrl: "spotify:playlist:TESTPLAYLIST1234567890" };
    case ClientToServerEvent.LoadCuratedPlaylist:
      return {
        ...room,
        tracks: [
          {
            id: "track-1",
            title: "Test Song",
            artist: "Test Artist",
            albumTitle: "Test Album",
            releaseYear: 1990,
          },
        ],
      };
    case ClientToServerEvent.RemovePlaylistTracks:
      return { ...room, trackIds: ["track-1"] };
    case ClientToServerEvent.UpdatePlaylistTrack:
      return { ...room, trackId: "track-1", releaseYear: 1979 };
    case ClientToServerEvent.PlaySpotifyTrack:
      return { ...device, spotifyTrackUri: "spotify:track:TEST12345", requestId: REQUEST_ID };
    case ClientToServerEvent.RegisterSpotifyPlaybackDevice:
      return device;
    case ClientToServerEvent.SearchSpotifyPlaylists:
      return { ...room, query: "80s" };
    case ClientToServerEvent.SearchSpotifyMusic:
      return { ...room, query: "Test Artist" };
    case ClientToServerEvent.OpenSpotifyPlaylist:
      return { ...room, playlistId: "TESTPLAYLIST12345" };
    case ClientToServerEvent.GenerateSpotifyCandidates:
      return {
        ...room,
        source: { type: "playlists", playlistIds: ["TESTPLAYLIST12345"], targetCount: 10 },
      };
    case ClientToServerEvent.UseSpotifyCandidates:
      return { ...room, candidateSessionId: "TEST_SESSION_1", trackIds: TEN_TRACK_IDS };
    default:
      return room;
  }
}

/** Host and guest in TEST_ROOM_1 with TT mode on, plus a connected socket outside the room. */
async function openRoom(phase: "lobby" | "turn") {
  const services = createSocketTestServices({ deck: turnOrderDeck() });
  const baseUrl = await startSocketTestServer(services);
  const seats = await openTwoPlayerLobby(baseUrl, ROOM_ID);
  const ttMode = await emitWithAck(seats.host.socket, ClientToServerEvent.UpdateRoomSettings, {
    roomId: ROOM_ID,
    ttModeEnabled: true,
  });
  expect(ttMode.ok).toBe(true);
  if (phase === "turn") await startGame(seats.host.socket, ROOM_ID, seats.guest.socket);
  const outsider = await connectTestClient(baseUrl);
  const readRoom = () => services.store.getRoomStateForMember(seats.host.socket.id!, ROOM_ID);
  return { ...seats, outsider, readRoom };
}

async function expectRefused(
  phase: "lobby" | "turn",
  caller: (seats: RoomSeats) => Socket,
  event: Event,
  code: string,
): Promise<void> {
  const seats = await openRoom(phase);
  const roomBefore = seats.readRoom();

  const ack = await emitWithAck(caller(seats), event, validPayload(event, seats.guest.playerId));

  expect(ack).toMatchObject({ ok: false, code });
  expect(seats.readRoom()).toEqual(roomBefore);
}

describe("socket authorisation", () => {
  it("assigns every client event to a public, room or result-event case", () => {
    const covered = [...PUBLIC_EVENTS, ...RESULT_EVENT_REFUSALS, ...ROOM_EVENTS];

    expect(covered.sort()).toEqual(Object.values(ClientToServerEvent).sort());
  });

  it.each(ROOM_EVENTS)("refuses %s from a socket outside the room", async (event) => {
    await expectRefused("lobby", (seats) => seats.outsider, event, "ROOM_MEMBERSHIP_NOT_FOUND");
  });

  it.each(HOST_ONLY_IN_LOBBY)(
    "refuses %s from a guest in the lobby with %s",
    async (event, code) => {
      await expectRefused("lobby", (seats) => seats.guest.socket, event, code);
    },
  );

  it.each(HOST_ONLY_IN_GAME)(
    "refuses %s from a guest during a turn with %s",
    async (event, code) => {
      await expectRefused("turn", (seats) => seats.guest.socket, event, code);
    },
  );

  it.each(ACTIVE_PLAYER_ONLY)(
    "refuses %s from a player whose turn it is not with %s",
    async (event, code) => {
      await expectRefused("turn", (seats) => seats.guest.socket, event, code);
    },
  );

  it.each(GAMEPLAY_BEFORE_START)("refuses %s in the lobby with %s", async (event, code) => {
    await expectRefused("lobby", (seats) => seats.host.socket, event, code);
  });

  it.each(SETUP_AFTER_START)("refuses %s during a turn with %s", async (event, code) => {
    // Every player may rename themselves in the lobby, so the guest proves the phase check.
    const caller = (seats: RoomSeats) =>
      event === ClientToServerEvent.UpdatePlayerProfile ? seats.guest.socket : seats.host.socket;
    await expectRefused("turn", caller, event, code);
  });
});

describe("socket authorisation on result events", () => {
  it("defers a token refresh from a socket outside the room without sending a token", async () => {
    const seats = await openRoom("lobby");
    const sentTokens = vi.fn();
    seats.outsider.on(ServerToClientEvent.SpotifyTokenRefreshed, sentTokens);
    const errorPromise = nextEvent<ServerErrorPayload>(seats.outsider, ServerToClientEvent.Error);

    seats.outsider.emit(ClientToServerEvent.RefreshSpotifyToken, { roomId: ROOM_ID });

    await expect(errorPromise).resolves.toMatchObject({ code: "SPOTIFY_TOKEN_REFRESH_DEFERRED" });
    expect(sentTokens).not.toHaveBeenCalled();
  });

  it("answers a guest's play request with not_playback_owner", async () => {
    const seats = await openRoom("lobby");
    const resultPromise = nextEvent<SpotifyPlaybackResultPayload>(
      seats.guest.socket,
      ServerToClientEvent.SpotifyPlaybackResult,
    );

    seats.guest.socket.emit(
      ClientToServerEvent.PlaySpotifyTrack,
      validPayload(ClientToServerEvent.PlaySpotifyTrack, seats.guest.playerId),
    );

    await expect(resultPromise).resolves.toMatchObject({
      success: false,
      requestId: REQUEST_ID,
      code: "not_playback_owner",
    });
  });

  it("ignores a device unregister from a socket outside the room", async () => {
    const seats = await openRoom("lobby");
    const roomBefore = seats.readRoom();

    await emitWithAck(seats.outsider, ClientToServerEvent.UnregisterSpotifyPlaybackDevice, {
      roomId: ROOM_ID,
    });

    expect(seats.readRoom()).toEqual(roomBefore);
  });
});
