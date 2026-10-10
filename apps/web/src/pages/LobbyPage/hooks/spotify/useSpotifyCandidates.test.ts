import { act, renderHook } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  type PublicTrackInfo,
} from "@tunetrack/shared/client";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { buildTrackCard, TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { useSpotifyCandidates } from "./useSpotifyCandidates";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    ...buildTrackCard({ title: "Test Song" }),
    releaseYear: 1999,
    metadataStatus: "imported",
    ...overrides,
  };
}

const TRACK_ONE = buildTrack({ id: "track-1", spotifyTrackUri: "spotify:track:TEST0001" });
const TRACK_TWO = buildTrack({
  id: "track-2",
  releaseYear: 2001,
  spotifyTrackUri: "spotify:track:TEST0002",
});

function renderCandidates({ roomId }: { roomId: string | undefined } = { roomId: TEST_ROOM_ID }) {
  const params = {
    currentPlaylistNameRef: { current: undefined as string | undefined },
    roomId,
    setGeneratedPlaylistMessage: vi.fn(),
    setSavedPlaylistMessage: vi.fn(),
    showGeneratedPlaylistMessage: vi.fn(),
  };
  const view = renderHook(() => useSpotifyCandidates(params), { wrapper: I18nTestWrapper });
  return { ...view, params };
}

async function generateReadyCandidates(view: ReturnType<typeof renderCandidates>) {
  await act(async () => {
    view.result.current.generateCandidatesFromPreset("80s_hits");
  });
  act(() => {
    socket.serverEmit(ServerToClientEvent.SpotifyCandidatesGenerated, {
      success: true,
      candidateSessionId: "TEST_CANDIDATE_SESSION_1",
      sourceSummary: "Test Mix",
      tracks: [TRACK_ONE, TRACK_TWO],
      importedCount: 2,
      filteredCount: 0,
      duplicateCount: 0,
      totalFetched: 2,
    });
  });
}

beforeEach(() => {
  resetSharedFakeSocket();
});

describe("useSpotifyCandidates", () => {
  it("starts idle with no selection and no candidates", () => {
    const { result } = renderCandidates();

    expect(result.current.candidatePhase).toBe("idle");
    expect(result.current.candidateError).toBeNull();
    expect(result.current.candidateSessionId).toBeNull();
    expect(result.current.candidateTracks).toEqual([]);
    expect(result.current.selectedSpotifyPlaylistIds.size).toBe(0);
  });

  it("toggles a playlist in and out of the selection", () => {
    const { result } = renderCandidates();

    act(() => result.current.toggleSpotifyPlaylistSelection("TESTPLAYLIST1"));
    expect([...result.current.selectedSpotifyPlaylistIds]).toEqual(["TESTPLAYLIST1"]);

    act(() => result.current.toggleSpotifyPlaylistSelection("TESTPLAYLIST1"));
    expect(result.current.selectedSpotifyPlaylistIds.size).toBe(0);
  });

  it("does not request generation from playlists while nothing is selected", async () => {
    const { result } = renderCandidates();

    await act(async () => result.current.generateCandidatesFromSelectedPlaylists());

    expect(result.current.candidatePhase).toBe("idle");
    expect(socket.emittedFor(ClientToServerEvent.GenerateSpotifyCandidates)).toEqual([]);
  });

  it("requests generation from the selected playlists with the generated track limit", async () => {
    const { result, params } = renderCandidates();
    act(() => {
      result.current.toggleSpotifyPlaylistSelection("TESTPLAYLIST1");
      result.current.toggleSpotifyPlaylistSelection("TESTPLAYLIST2");
    });

    await act(async () => result.current.generateCandidatesFromSelectedPlaylists());

    expect(result.current.candidatePhase).toBe("generating");
    expect(params.setGeneratedPlaylistMessage).toHaveBeenCalledWith(null);
    expect(socket.emittedFor(ClientToServerEvent.GenerateSpotifyCandidates)).toEqual([
      {
        roomId: TEST_ROOM_ID,
        source: {
          type: "playlists",
          playlistIds: ["TESTPLAYLIST1", "TESTPLAYLIST2"],
          targetCount: SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
        },
      },
    ]);
    expect(socket.listenerCount(ServerToClientEvent.SpotifyCandidatesGenerated)).toBe(1);
  });

  it("requests generation from a preset with the default or an explicit target count", async () => {
    const { result } = renderCandidates();

    await act(async () => result.current.generateCandidatesFromPreset("80s_hits"));
    await act(async () => result.current.generateCandidatesFromPreset("80s_hits", 12));

    expect(socket.emittedFor(ClientToServerEvent.GenerateSpotifyCandidates)).toEqual([
      {
        roomId: TEST_ROOM_ID,
        source: {
          type: "preset",
          presetId: "80s_hits",
          targetCount: SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
        },
      },
      {
        roomId: TEST_ROOM_ID,
        source: { type: "preset", presetId: "80s_hits", targetCount: 12 },
      },
    ]);
  });

  it("does nothing without a room", async () => {
    const { result, params } = renderCandidates({ roomId: undefined });

    await act(async () => result.current.generateCandidatesFromPreset("80s_hits"));

    expect(result.current.candidatePhase).toBe("idle");
    expect(params.setGeneratedPlaylistMessage).not.toHaveBeenCalled();
    expect(socket.emitted).toEqual([]);
  });

  it("stores the generated candidates and stops listening on success", async () => {
    const view = renderCandidates();

    await generateReadyCandidates(view);

    expect(view.result.current.candidatePhase).toBe("ready");
    expect(view.result.current.candidateSessionId).toBe("TEST_CANDIDATE_SESSION_1");
    expect(view.result.current.candidateSourceSummary).toBe("Test Mix");
    expect(view.result.current.candidateTracks).toEqual([TRACK_ONE, TRACK_TWO]);
    expect(socket.listenerCount(ServerToClientEvent.SpotifyCandidatesGenerated)).toBe(0);
  });

  it("shows the server message when generation fails", async () => {
    const { result } = renderCandidates();
    await act(async () => result.current.generateCandidatesFromPreset("80s_hits"));

    act(() => {
      socket.serverEmit(ServerToClientEvent.SpotifyCandidatesGenerated, {
        success: false,
        code: "too_few_tracks",
        message: "Not enough tracks.",
      });
    });

    expect(result.current.candidatePhase).toBe("error");
    expect(result.current.candidateError).toBe("Not enough tracks.");
    expect(result.current.candidateTracks).toEqual([]);
    expect(socket.listenerCount(ServerToClientEvent.SpotifyCandidatesGenerated)).toBe(0);
  });

  it("clears the previous error when a new generation starts", async () => {
    const { result } = renderCandidates();
    act(() => result.current.setCandidateError("Old error"));

    await act(async () => result.current.generateCandidatesFromPreset("80s_hits"));

    expect(result.current.candidateError).toBeNull();
  });

  it("removes one candidate track", async () => {
    const view = renderCandidates();
    await generateReadyCandidates(view);

    act(() => view.result.current.removeCandidateTrack("track-1"));

    expect(view.result.current.candidateTracks).toEqual([TRACK_TWO]);
  });

  it("edits one candidate track, keeping the source year and promoting nothing implicitly", async () => {
    const view = renderCandidates();
    await generateReadyCandidates(view);

    act(() => view.result.current.updateCandidateTrack("track-1", { releaseYear: 1975 }));

    const [edited, untouched] = view.result.current.candidateTracks;
    expect(edited).toMatchObject({
      id: "track-1",
      releaseYear: 1975,
      sourceReleaseYear: 1999,
      metadataStatus: "imported",
    });
    expect(untouched).toEqual(TRACK_TWO);
  });

  it("keeps an existing source year and applies an explicit metadata status", async () => {
    const view = renderCandidates();
    await act(async () => view.result.current.generateCandidatesFromPreset("80s_hits"));
    act(() => {
      socket.serverEmit(ServerToClientEvent.SpotifyCandidatesGenerated, {
        success: true,
        candidateSessionId: "TEST_CANDIDATE_SESSION_1",
        sourceSummary: "Test Mix",
        tracks: [{ ...TRACK_ONE, sourceReleaseYear: 2010 }],
        importedCount: 1,
        filteredCount: 0,
        duplicateCount: 0,
        totalFetched: 1,
      });
    });

    act(() =>
      view.result.current.updateCandidateTrack("track-1", {
        releaseYear: 1975,
        metadataStatus: "verified",
      }),
    );

    expect(view.result.current.candidateTracks[0]).toMatchObject({
      releaseYear: 1975,
      sourceReleaseYear: 2010,
      metadataStatus: "verified",
    });
  });

  it("discards generated candidates", async () => {
    const view = renderCandidates();
    await generateReadyCandidates(view);

    act(() => view.result.current.discardGeneratedCandidates());

    expect(view.result.current.candidatePhase).toBe("idle");
    expect(view.result.current.candidateSessionId).toBeNull();
    expect(view.result.current.candidateSourceSummary).toBeNull();
    expect(view.result.current.candidateTracks).toEqual([]);
  });

  it("resets candidates and the playlist selection", async () => {
    const view = renderCandidates();
    act(() => view.result.current.toggleSpotifyPlaylistSelection("TESTPLAYLIST1"));
    await generateReadyCandidates(view);

    act(() => view.result.current.resetCandidates());

    expect(view.result.current.selectedSpotifyPlaylistIds.size).toBe(0);
    expect(view.result.current.candidatePhase).toBe("idle");
    expect(view.result.current.candidateTracks).toEqual([]);
  });

  describe("applyGeneratedCandidates", () => {
    it("does nothing before candidates exist", async () => {
      const { result } = renderCandidates();

      await act(async () => result.current.applyGeneratedCandidates());

      expect(result.current.candidatePhase).toBe("idle");
      expect(socket.emittedFor(ClientToServerEvent.UseSpotifyCandidates)).toEqual([]);
    });

    it("does nothing when the chosen track ids match no candidate", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);

      await act(async () =>
        view.result.current.applyGeneratedCandidates("replace", ["track-unknown"]),
      );

      expect(view.result.current.candidatePhase).toBe("ready");
      expect(socket.emittedFor(ClientToServerEvent.UseSpotifyCandidates)).toEqual([]);
    });

    it("sends every candidate in replace mode by default", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);

      await act(async () => view.result.current.applyGeneratedCandidates());

      expect(view.result.current.candidatePhase).toBe("applying");
      expect(socket.emittedFor(ClientToServerEvent.UseSpotifyCandidates)).toEqual([
        {
          roomId: TEST_ROOM_ID,
          candidateSessionId: "TEST_CANDIDATE_SESSION_1",
          trackIds: ["track-1", "track-2"],
          tracks: [TRACK_ONE, TRACK_TWO],
          mode: "replace",
        },
      ]);
    });

    it("sends only the chosen tracks when track ids are given", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);

      await act(async () => view.result.current.applyGeneratedCandidates("append", ["track-2"]));

      expect(socket.emittedFor(ClientToServerEvent.UseSpotifyCandidates)).toEqual([
        expect.objectContaining({ trackIds: ["track-2"], tracks: [TRACK_TWO], mode: "append" }),
      ]);
    });

    it("clears the candidates, names the playlist and announces the server count on replace", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);
      await act(async () => view.result.current.applyGeneratedCandidates());

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifyCandidatesApplied, {
          success: true,
          importedCount: 7,
        });
      });

      const message = "7 generated tracks selected for this room.";
      expect(view.result.current.candidatePhase).toBe("idle");
      expect(view.result.current.candidateSessionId).toBeNull();
      expect(view.result.current.candidateSourceSummary).toBeNull();
      expect(view.result.current.candidateTracks).toEqual([]);
      expect(view.params.currentPlaylistNameRef.current).toBe("Test Mix");
      expect(view.params.setSavedPlaylistMessage).toHaveBeenCalledWith(message);
      expect(view.params.showGeneratedPlaylistMessage).toHaveBeenCalledWith(message);
      expect(socket.listenerCount(ServerToClientEvent.SpotifyCandidatesApplied)).toBe(0);
    });

    it("announces the number of sent tracks on append", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);
      await act(async () => view.result.current.applyGeneratedCandidates("append", ["track-1"]));

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifyCandidatesApplied, {
          success: true,
          importedCount: 7,
        });
      });

      expect(view.params.showGeneratedPlaylistMessage).toHaveBeenCalledWith(
        "1 songs added to the queued playlist.",
      );
    });

    it("keeps the candidates and shows the server message when applying fails", async () => {
      const view = renderCandidates();
      await generateReadyCandidates(view);
      await act(async () => view.result.current.applyGeneratedCandidates());

      act(() => {
        socket.serverEmit(ServerToClientEvent.SpotifyCandidatesApplied, {
          success: false,
          code: "candidate_session_expired",
          message: "Candidate session expired.",
        });
      });

      expect(view.result.current.candidatePhase).toBe("error");
      expect(view.result.current.candidateError).toBe("Candidate session expired.");
      expect(view.result.current.candidateTracks).toEqual([TRACK_ONE, TRACK_TWO]);
      expect(view.params.setSavedPlaylistMessage).not.toHaveBeenCalled();
      expect(socket.listenerCount(ServerToClientEvent.SpotifyCandidatesApplied)).toBe(0);
    });
  });
});
