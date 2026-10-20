import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistTracksPayload,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { describe, expect, it } from "vitest";
import { createRoomAsHost } from "../support/roomFixtures.js";
import { startSocketTestServer } from "../support/socketTestServer.js";
import { nextEvent, waitForStateUpdate } from "../support/waiters.js";

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

async function openHostRoom(roomId: string): Promise<Socket> {
  const host = await createRoomAsHost(await startSocketTestServer(), roomId);
  return host.socket;
}

function loadCuratedPlaylist(host: Socket, payload: object): Promise<PlaylistTracksPayload> {
  const tracksPromise = nextEvent<PlaylistTracksPayload>(host, ServerToClientEvent.PlaylistTracks);
  host.emit(ClientToServerEvent.LoadCuratedPlaylist, payload);
  return tracksPromise;
}

describe("curated playlist", () => {
  it("loads a curated playlist into the lobby deck", async () => {
    const host = await openHostRoom("curated-room");
    const importedPromise = waitForStateUpdate(
      host,
      (state) => state.settings.importedTrackCount === 659,
    );
    const tracks = Array.from({ length: 659 }, (_, index) => ({
      ...buildCuratedTrack(
        `curated-track-${index + 1}`,
        `Curated Song ${index + 1}`,
        `spotify:track:curated-track-${index + 1}`,
      ),
      sourceReleaseYear: 2000,
      metadataStatus: "edited",
    }));

    const loaded = await loadCuratedPlaylist(host, { roomId: "curated-room", tracks });

    await importedPromise;
    expect(loaded.tracks).toHaveLength(659);
    expect(loaded.tracks[0]).toEqual(
      expect.objectContaining({
        id: "curated-track-1",
        releaseYear: 1986,
        sourceReleaseYear: 2000,
        metadataStatus: "edited",
        spotifyTrackUri: "spotify:track:curated-track-1",
      }),
    );
    expect(loaded.tracks[658]).toEqual(
      expect.objectContaining({
        id: "curated-track-659",
        spotifyTrackUri: "spotify:track:curated-track-659",
      }),
    );
  });

  it("appends curated tracks to the current lobby deck and dedupes duplicates", async () => {
    const host = await openHostRoom("append-room");
    await expect(
      loadCuratedPlaylist(host, {
        roomId: "append-room",
        tracks: [
          buildCuratedTrack("track-1", "First Song", "spotify:track:one"),
          buildCuratedTrack("track-2", "Second Song", "spotify:track:two"),
        ],
        mode: "replace",
      }),
    ).resolves.toEqual({
      tracks: [
        expect.objectContaining({ id: "track-1", spotifyTrackUri: "spotify:track:one" }),
        expect.objectContaining({ id: "track-2", spotifyTrackUri: "spotify:track:two" }),
      ],
    });
    const appendedStatePromise = waitForStateUpdate(
      host,
      (state) => state.settings.importedTrackCount === 3,
    );

    const appended = await loadCuratedPlaylist(host, {
      roomId: "append-room",
      tracks: [
        buildCuratedTrack("track-2-copy", "Second Song", "spotify:track:two"),
        buildCuratedTrack("track-3", "Third Song", "spotify:track:three"),
      ],
      mode: "append",
    });

    await appendedStatePromise;
    expect(appended.tracks.map((track) => track.spotifyTrackUri)).toEqual([
      "spotify:track:one",
      "spotify:track:two",
      "spotify:track:three",
    ]);
  });

  it("dedupes duplicate tracks when replacing the lobby deck", async () => {
    const host = await openHostRoom("dedupe-room");

    const loaded = await loadCuratedPlaylist(host, {
      roomId: "dedupe-room",
      tracks: [
        buildCuratedTrack("track-1", "First Song", "spotify:track:one"),
        buildCuratedTrack("track-1-dup", "First Song Again", "spotify:track:one"),
        buildCuratedTrack("track-2", "Second Song", "spotify:track:two"),
      ],
      mode: "replace",
    });

    expect(loaded.tracks.map((track) => track.spotifyTrackUri)).toEqual([
      "spotify:track:one",
      "spotify:track:two",
    ]);
  });
});
