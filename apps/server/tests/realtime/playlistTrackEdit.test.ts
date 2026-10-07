import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistTrackUpdatedPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { describe, expect, it } from "vitest";
import {
  connectTestClient,
  nextEvent,
  startSocketTestServer,
} from "../support/socketTestServer.js";

async function createRoomWithDeck(host: Socket, trackCount: number) {
  host.emit(ClientToServerEvent.CreateRoom, {
    roomId: "TEST_ROOM_1",
    displayName: "Player One",
    sessionId: "host-session",
  });
  await nextEvent(host, ServerToClientEvent.PlayerIdentity);

  const loadedPromise = nextEvent(host, ServerToClientEvent.PlaylistTracks);
  host.emit(ClientToServerEvent.LoadCuratedPlaylist, {
    roomId: "TEST_ROOM_1",
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      id: `track-${index + 1}`,
      title: `Test Track ${index + 1}`,
      artist: "Test Artist",
      albumTitle: "Test Album",
      releaseYear: 1980 + index,
      metadataStatus: "imported",
    })),
  });
  await loadedPromise;
}

describe("playlist track edit reply (05 A10, B-16)", () => {
  it("answers an edit with the edited track only, not the whole deck", async () => {
    const host = await connectTestClient(await startSocketTestServer());
    await createRoomWithDeck(host, 40);
    let fullDeckReplies = 0;
    host.on(ServerToClientEvent.PlaylistTracks, () => {
      fullDeckReplies += 1;
    });

    const updatedPromise = nextEvent<PlaylistTrackUpdatedPayload>(
      host,
      ServerToClientEvent.PlaylistTrackUpdated,
    );
    const statePromise = nextEvent<StateUpdatePayload>(host, ServerToClientEvent.StateUpdate);
    host.emit(ClientToServerEvent.UpdatePlaylistTrack, {
      roomId: "TEST_ROOM_1",
      trackId: "track-7",
      releaseYear: 1975,
    });

    await expect(updatedPromise).resolves.toEqual({
      track: expect.objectContaining({
        id: "track-7",
        releaseYear: 1975,
        sourceReleaseYear: 1986,
        metadataStatus: "edited",
      }),
    });
    await statePromise;
    expect(fullDeckReplies).toBe(0);
  });
});
