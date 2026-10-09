import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ServerErrorPayload,
  type SpotifyPlaybackResultPayload,
} from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { createRoomAsHost, emitWithAck, openTwoPlayerLobby } from "../support/roomFixtures.js";
import { connectTestClient, startSocketTestServer } from "../support/socketTestServer.js";
import { nextEvent } from "../support/waiters.js";

const PLAYBACK_REQUEST_ID = "00000000-0000-4000-8000-000000000201";

/**
 * Request/result events run through the shared handler pipeline: every failure is
 * acknowledged and audited, and the client still gets the answer on the result event it waits for.
 */
describe("music setup request/result events", () => {
  it("answers an invalid playlist import on the import result and rejects the ack", async () => {
    const host = await createRoomAsHost(await startSocketTestServer(), "import-room");
    const resultPromise = nextEvent(host.socket, ServerToClientEvent.PlaylistImportResult);

    const ack = await emitWithAck(host.socket, ClientToServerEvent.ImportPlaylist, {
      roomId: "import-room",
      playlistUrl: "",
      requestId: "00000000-0000-4000-8000-000000000202",
    });

    expect(ack).toEqual({
      ok: false,
      requestId: "00000000-0000-4000-8000-000000000202",
      code: "INVALID_IMPORT_PLAYLIST_PAYLOAD",
    });
    await expect(resultPromise).resolves.toEqual({
      success: false,
      code: "invalid_url",
      message: "Playlist URL is invalid.",
    });
  });

  it("refuses a guest's playlist import with the domain error, not a result", async () => {
    const { guest } = await openTwoPlayerLobby(await startSocketTestServer(), "import-room");
    const errorPromise = nextEvent<ServerErrorPayload>(guest.socket, ServerToClientEvent.Error);

    const ack = await emitWithAck(guest.socket, ClientToServerEvent.ImportPlaylist, {
      roomId: "import-room",
      playlistUrl: "https://example.invalid/playlist/TEST",
      requestId: "00000000-0000-4000-8000-000000000203",
    });

    const error = await errorPromise;
    expect(ack).toEqual({
      ok: false,
      requestId: "00000000-0000-4000-8000-000000000203",
      code: error.code,
    });
    expect(error).toEqual({
      code: "ONLY_HOST_CAN_IMPORT_PLAYLIST",
      message: "Only the host can set up the music.",
    });
  });

  it("answers an invalid music search on the search result", async () => {
    const host = await createRoomAsHost(await startSocketTestServer(), "search-room");
    const resultPromise = nextEvent(host.socket, ServerToClientEvent.SpotifySmartSearchResult);

    host.socket.emit(ClientToServerEvent.SearchSpotifyMusic, { roomId: "search-room", query: "" });

    await expect(resultPromise).resolves.toEqual({
      success: false,
      code: "invalid_query",
      message: "Search query is invalid.",
    });
  });

  it("answers a non-member's playback request on the playback result with its request id", async () => {
    const outsider = await connectTestClient(await startSocketTestServer());
    const resultPromise = nextEvent<SpotifyPlaybackResultPayload>(
      outsider,
      ServerToClientEvent.SpotifyPlaybackResult,
    );

    const ack = await emitWithAck(outsider, ClientToServerEvent.PlaySpotifyTrack, {
      roomId: "TEST_ROOM_1",
      deviceId: "TEST_DEVICE_1",
      spotifyTrackUri: "spotify:track:TEST12345",
      requestId: PLAYBACK_REQUEST_ID,
      playbackGeneration: 0,
    });

    expect(ack).toEqual({
      ok: false,
      requestId: PLAYBACK_REQUEST_ID,
      code: "ROOM_MEMBERSHIP_NOT_FOUND",
    });
    await expect(resultPromise).resolves.toEqual({
      success: false,
      requestId: PLAYBACK_REQUEST_ID,
      code: "spotify_api_error",
      message: "Spotify could not start playback.",
    });
  });
});
