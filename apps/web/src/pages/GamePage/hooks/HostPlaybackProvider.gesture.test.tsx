import { act, render, waitFor } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
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
import { HostPlaybackProvider } from "./HostPlaybackProvider";

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

describe("HostPlaybackProvider", () => {
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

  it("spends the next host gesture on the track autoplay refused to start", async () => {
    const socket = getSharedFakeSocket();
    render(
      <HostPlaybackProvider enabled roomId={TEST_ROOM_ID} roomState={buildPremiumRoomState()}>
        <div />
      </HostPlaybackProvider>,
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

    await waitFor(() =>
      expect(socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack).length).toBe(1),
    );
    const requests = socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack);
    const { requestId } = requests[0] as { requestId: string };
    await act(async () => {
      socket.serverEmit(ServerToClientEvent.SpotifyPlaybackResult, { success: true, requestId });
    });
    await act(async () => {
      player.emitAutoplayFailed();
    });

    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    await waitFor(() =>
      expect(socket.emittedFor(ClientToServerEvent.PlaySpotifyTrack).length).toBe(2),
    );
  });
});
