import { loadCuratedPlaylistPayloadSchema } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { SpotifyPlaybackSessionStore } from "../../src/spotify/SpotifyPlaybackSessionStore.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";
import { createTestRoomServices } from "../support/roomServices.js";

const ROOM_ID = "TEST_ROOM_1";
const HOST_SOCKET_ID = "host-socket";
const GUEST_SOCKET_ID = "guest-socket";

function openRoomWithSpotify() {
  const tokenStore = new SpotifyTokenStore();
  const playbackSessions = new SpotifyPlaybackSessionStore();
  const services = createTestRoomServices({ tokenStore, spotify: { playbackSessions } });
  services.lobby.createRoom(ROOM_ID, "Player One", HOST_SOCKET_ID, "host-session");
  services.lobby.addPlayerToRoom(ROOM_ID, "Player Two", GUEST_SOCKET_ID, "guest-session");
  tokenStore.setHostTokens(ROOM_ID, "access-token", "refresh-token", 3600, "premium");
  playbackSessions.registerDevice(ROOM_ID, HOST_SOCKET_ID, "TEST_DEVICE_1");
  return { services, tokenStore, playbackSessions };
}

/** The rooms layer only announces lifecycle facts; these prove the container wires Spotify to them. */
describe("room services container", () => {
  it("clears the room's Spotify login and playback device when the host closes it", () => {
    const { services, tokenStore, playbackSessions } = openRoomWithSpotify();

    services.lobby.closeRoom(HOST_SOCKET_ID, { roomId: ROOM_ID });

    expect(tokenStore.getHostTokenRecord(ROOM_ID)).toBeNull();
    expect(playbackSessions.getRegisteredDevice(ROOM_ID)).toBeNull();
  });

  it("forgets a playback device when its socket leaves", () => {
    const { services, tokenStore, playbackSessions } = openRoomWithSpotify();

    services.connection.removePlayerBySocketId(HOST_SOCKET_ID);
    services.timers.clearAll();

    expect(playbackSessions.getRegisteredDevice(ROOM_ID)).toBeNull();
    expect(tokenStore.getHostTokenRecord(ROOM_ID)).not.toBeNull();
  });

  it("deals from the host's imported deck when the game starts", () => {
    const { services } = openRoomWithSpotify();
    const trackIds = Array.from({ length: 12 }, (_, index) => `curated-track-${index + 1}`);
    services.playlists.loadCuratedPlaylist(
      loadCuratedPlaylistPayloadSchema.parse({
        roomId: ROOM_ID,
        tracks: trackIds.map((id, index) => ({
          id,
          title: `Test Song ${index + 1}`,
          artist: "Test Artist",
          albumTitle: "Test Album",
          releaseYear: 1980 + index,
          metadataStatus: "imported",
        })),
      }),
      HOST_SOCKET_ID,
    );

    const roomState = services.gameplay.startGame(HOST_SOCKET_ID, { roomId: ROOM_ID });

    expect(trackIds).toContain(roomState.currentTrackCard?.id);
  });
});
