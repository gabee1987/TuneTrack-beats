import { act, render, waitFor } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicRoomState,
} from "@tunetrack/shared/client";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
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
import { HostPlaybackProvider, useHostPlaybackControls } from "./HostPlaybackProvider";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const TRACK_URI = "spotify:track:TEST0000000000000001";

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

const controlsRenders = { count: 0 };

function ControlsConsumer() {
  useHostPlaybackControls();
  controlsRenders.count += 1;
  return null;
}

describe("HostPlaybackProvider progress (05 §2.2, C6)", () => {
  let player: FakeSpotifyPlayer;

  beforeEach(() => {
    // Only intervals are faked, and they follow real time too, so the SDK setup below runs
    // as usual; `advanceTimersByTime` then stands in for ten seconds of playback.
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setInterval", "clearInterval"] });
    resetSharedFakeSocket();
    player = createFakeSpotifyPlayer();
    installFakeSpotifySdk(player);
    controlsRenders.count = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallFakeSpotifySdk();
    vi.restoreAllMocks();
  });

  it("commits nothing periodically while a track plays and the playback tab is closed", async () => {
    const socket = getSharedFakeSocket();
    let commits = 0;
    render(
      <Profiler id="playback" onRender={() => (commits += 1)}>
        <HostPlaybackProvider enabled roomId={TEST_ROOM_ID} roomState={buildPremiumRoomState()}>
          <ControlsConsumer />
        </HostPlaybackProvider>
      </Profiler>,
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
    await act(async () => {
      player.emitPlaying(TRACK_URI, 1_000);
    });
    const controlsRendersWhilePlaying = controlsRenders.count;
    commits = 0;

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(commits).toBe(0);

    await act(async () => {
      player.emitPlaying(TRACK_URI, 12_000);
    });
    // A new position snapshot is a progress change; the controls consumer stays put.
    expect(controlsRenders.count).toBe(controlsRendersWhilePlaying);
  });
});
