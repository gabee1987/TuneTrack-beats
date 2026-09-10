import { act, renderHook, waitFor } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket, type FakeSocket } from "../../../test/fakeSocket";
import {
  createFakeSpotifyPlayer,
  installFakeSpotifySdk,
  uninstallFakeSpotifySdk,
  type FakeSpotifyPlayer,
} from "../../../test/fakeSpotifyPlayer";
import {
  TEST_HOST_ID,
  TEST_ROOM_ID,
  buildRoomSettings,
  buildTrackCard,
  buildTurnRoomState,
} from "../../../test/roomStateFixtures";
import { useHostPlayback } from "./useHostPlayback";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const TRACK_URI = "spotify:track:TEST0000000000000001";
const STALE_TRACK_URI = "spotify:track:TEST0000000000000002";
const PREVIEW_URL = "https://preview.test/TEST_PREVIEW.mp3";

function buildPremiumRoomState(): PublicRoomState {
  return {
    ...buildTurnRoomState(),
    currentTrackCard: buildTrackCard({ id: "track-current", spotifyTrackUri: TRACK_URI }),
    settings: buildRoomSettings({
      spotifyAccountType: "premium",
      spotifyAuthStatus: "connected",
      playlistImported: true,
      spotifyPlaybackOwnerPlayerId: TEST_HOST_ID,
    }),
  };
}

function buildFreeRoomState(cardId: string): PublicRoomState {
  return {
    ...buildTurnRoomState(),
    currentTrackCard: buildTrackCard({ id: cardId, previewUrl: PREVIEW_URL }),
    settings: buildRoomSettings({
      spotifyAccountType: "free",
      spotifyAuthStatus: "connected",
      playlistImported: true,
      spotifyPlaybackOwnerPlayerId: TEST_HOST_ID,
    }),
  };
}

/**
 * Walks the hook through the whole boot: token refresh, player construction, device ready.
 * Every step is driven by a server event or a player event, so nothing here reaches past
 * the hook's own boundaries.
 */
async function bootPremiumPlayback(player: FakeSpotifyPlayer) {
  const socket = getSharedFakeSocket();
  const roomState = buildPremiumRoomState();
  const view = renderHook(() =>
    useHostPlayback({ roomId: TEST_ROOM_ID, roomState, enabled: true }),
  );

  await waitFor(() =>
    expect(socket.emittedFor(ClientToServerEvent.RefreshSpotifyToken).length).toBeGreaterThan(0),
  );
  await act(async () => {
    socket.serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
      accessToken: "TEST_ACCESS_TOKEN",
    });
  });

  await waitFor(() => expect(player.connect).toHaveBeenCalled());
  await act(async () => {
    player.emitReady();
  });

  return { socket, view };
}

function playRequestCount(socket: FakeSocket): number {
  return socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack).length;
}

/** Long enough to cross the ladder's first retry delay of 2500 ms. */
const PAST_FIRST_RETRY_MS = 3_200;

async function waitPastFirstRetry() {
  // Real time rather than fake timers: the ladder's sleep is created deep inside the hook's
  // own async flow, and swapping the clock underneath it is how a test starts passing
  // vacuously.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, PAST_FIRST_RETRY_MS));
  });
}

function latestPlayRequestId(socket: FakeSocket): string {
  const requests = socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack);
  return (requests[requests.length - 1] as { requestId: string }).requestId;
}

/** Answers the most recent play request with a server-side failure. */
async function failLatestPlayRequest(socket: FakeSocket) {
  const requestId = latestPlayRequestId(socket);
  await act(async () => {
    socket.serverEmit(ServerToClientEvent.SpotifyPlaybackResult, {
      success: false,
      requestId,
      code: "spotify_api_error",
      message: "TEST_FAILURE",
    });
  });
}

/** Answers the most recent play request and reports the track as audible. */
async function completeLatestPlayRequest(socket: FakeSocket, player: FakeSpotifyPlayer) {
  const requests = socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack);
  const latest = requests[requests.length - 1] as { requestId: string };

  await act(async () => {
    socket.serverEmit(ServerToClientEvent.SpotifyPlaybackResult, {
      success: true,
      requestId: latest.requestId,
    });
  });
  await act(async () => {
    player.emitPlaying(TRACK_URI);
  });
}

describe("useHostPlayback", () => {
  let player: FakeSpotifyPlayer;

  beforeEach(() => {
    resetSharedFakeSocket();
    player = createFakeSpotifyPlayer();
    installFakeSpotifySdk(player);
  });

  afterEach(() => {
    uninstallFakeSpotifySdk();
    vi.restoreAllMocks();
  });

  describe("premium, after the track has ended", () => {
    it("re-issues the track rather than resuming an exhausted context", async () => {
      const { socket, view } = await bootPremiumPlayback(player);

      await waitFor(() => expect(playRequestCount(socket)).toBe(1));
      await completeLatestPlayRequest(socket, player);

      await act(async () => {
        player.emitEndedAtDuration(TRACK_URI);
      });

      act(() => {
        view.result.current.resume();
      });

      await waitFor(() => expect(playRequestCount(socket)).toBe(2));
      expect(player.resume).not.toHaveBeenCalled();
    });

    it("recognises the end-of-context shape that reports position zero", async () => {
      const { socket, view } = await bootPremiumPlayback(player);

      await waitFor(() => expect(playRequestCount(socket)).toBe(1));
      await completeLatestPlayRequest(socket, player);

      await act(async () => {
        player.emitEndedAtZero(TRACK_URI);
      });

      act(() => {
        view.result.current.resume();
      });

      await waitFor(() => expect(playRequestCount(socket)).toBe(2));
      expect(player.resume).not.toHaveBeenCalled();
    });
  });

  it("still resumes in place when the track is only paused part-way through", async () => {
    const { socket, view } = await bootPremiumPlayback(player);

    await waitFor(() => expect(playRequestCount(socket)).toBe(1));
    await completeLatestPlayRequest(socket, player);

    await act(async () => {
      player.emitPausedMidTrack(TRACK_URI, 60_000);
    });

    act(() => {
      view.result.current.resume();
    });

    expect(player.resume).toHaveBeenCalledTimes(1);
    expect(playRequestCount(socket)).toBe(1);
  });

  it("restarts a track that is still playing", async () => {
    const { socket, view } = await bootPremiumPlayback(player);

    await waitFor(() => expect(playRequestCount(socket)).toBe(1));
    await completeLatestPlayRequest(socket, player);

    act(() => {
      view.result.current.restart();
    });

    await waitFor(() => expect(playRequestCount(socket)).toBe(2));
  });

  describe("when autoplay is blocked", () => {
    it("stops retrying, because only a gesture can lift the block", async () => {
      const { socket, view } = await bootPremiumPlayback(player);

      await waitFor(() => expect(playRequestCount(socket)).toBe(1));
      const requestId = latestPlayRequestId(socket);
      await act(async () => {
        socket.serverEmit(ServerToClientEvent.SpotifyPlaybackResult, {
          success: true,
          requestId,
        });
      });
      await act(async () => {
        player.emitAutoplayFailed();
      });

      await waitFor(() => expect(view.result.current.needsUserGesture).toBe(true));

      await waitPastFirstRetry();
      expect(playRequestCount(socket)).toBe(1);
    });
  });

  it("lets the host's own play win over a retry that is still pending", async () => {
    const { socket, view } = await bootPremiumPlayback(player);

    await waitFor(() => expect(playRequestCount(socket)).toBe(1));
    await failLatestPlayRequest(socket);

    act(() => {
      view.result.current.restart();
    });

    await waitFor(() => expect(playRequestCount(socket)).toBe(2));
    await completeLatestPlayRequest(socket, player);

    // The ladder would otherwise wake at 2500 ms and supersede the host's own request,
    // which is what left the play button doing nothing after a reload.
    await waitPastFirstRetry();
    expect(playRequestCount(socket)).toBe(2);
  });

  it("re-issues the card instead of resuming whatever the device still holds", async () => {
    const { socket, view } = await bootPremiumPlayback(player);

    await waitFor(() => expect(playRequestCount(socket)).toBe(1));
    await completeLatestPlayRequest(socket, player);

    // The device is sitting on the previous card, paused half way in — resuming that is
    // what made a new card come back mid-song.
    await act(async () => {
      player.emitPausedMidTrack(STALE_TRACK_URI, 60_000);
    });

    act(() => {
      view.result.current.resume();
    });

    await waitFor(() => expect(playRequestCount(socket)).toBe(2));
    expect(player.resume).not.toHaveBeenCalled();
  });

  it("plays a new card that repeats the previous track instead of leaving it where it was", async () => {
    const socket = getSharedFakeSocket();
    const firstCard = buildPremiumRoomState();
    const view = renderHook(
      ({ roomState }: { roomState: PublicRoomState }) =>
        useHostPlayback({ roomId: TEST_ROOM_ID, roomState, enabled: true }),
      { initialProps: { roomState: firstCard } },
    );

    await waitFor(() =>
      expect(socket.emittedFor(ClientToServerEvent.RefreshSpotifyToken).length).toBeGreaterThan(0),
    );
    await act(async () => {
      socket.serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
        accessToken: "TEST_ACCESS_TOKEN",
      });
    });
    await waitFor(() => expect(player.connect).toHaveBeenCalled());
    await act(async () => {
      player.emitReady();
    });

    await waitFor(() => expect(playRequestCount(socket)).toBe(1));
    await completeLatestPlayRequest(socket, player);

    // A different card carrying the same Spotify track — a duplicate in the playlist, or the
    // same card coming round again. The URI has not changed, but the turn has.
    const repeatCard: PublicRoomState = {
      ...firstCard,
      currentTrackCard: buildTrackCard({ id: "track-repeat", spotifyTrackUri: TRACK_URI }),
    };
    view.rerender({ roomState: repeatCard });

    await waitFor(() => expect(playRequestCount(socket)).toBe(2));
  });

  it("keeps asking for a token after the server defers one, instead of never building the player", async () => {
    const socket = getSharedFakeSocket();
    renderHook(() =>
      useHostPlayback({ roomId: TEST_ROOM_ID, roomState: buildPremiumRoomState(), enabled: true }),
    );

    await waitFor(() =>
      expect(socket.emittedFor(ClientToServerEvent.RefreshSpotifyToken).length).toBe(1),
    );
    await act(async () => {
      socket.serverEmit(ServerToClientEvent.Error, {
        code: "SPOTIFY_TOKEN_REFRESH_DEFERRED",
        message: "Spotify token refresh deferred.",
      });
    });

    expect(player.connect).not.toHaveBeenCalled();

    await waitFor(
      () => expect(socket.emittedFor(ClientToServerEvent.RefreshSpotifyToken).length).toBe(2),
      { timeout: 10_000 },
    );
    await act(async () => {
      socket.serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
        accessToken: "TEST_ACCESS_TOKEN",
      });
    });

    await waitFor(() => expect(player.connect).toHaveBeenCalled());
  }, 20_000);

  it("replays a free-tier preview when the next card carries the same url", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());

    const view = renderHook(
      ({ roomState }: { roomState: PublicRoomState }) =>
        useHostPlayback({ roomId: TEST_ROOM_ID, roomState, enabled: true }),
      { initialProps: { roomState: buildFreeRoomState("track-a") } },
    );

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));

    view.rerender({ roomState: buildFreeRoomState("track-b") });

    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  });
});
