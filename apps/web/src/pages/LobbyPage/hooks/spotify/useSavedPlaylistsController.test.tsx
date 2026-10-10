import { act, renderHook } from "@testing-library/react";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicTrackInfo,
} from "@tunetrack/shared/client";
import type { MutableRefObject, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import {
  listSavedPlaylists,
  savePlaylist,
} from "../../../../services/savedPlaylists/savedPlaylists";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { TEST_ROOM_ID, buildTrackCard } from "../../../../test/roomStateFixtures";
import { useSavedPlaylistsController } from "./useSavedPlaylistsController";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const SOURCE_URL = "https://open.spotify.com/playlist/TEST_PLAYLIST_1";

interface HookProps {
  loadedSavedPlaylistId: string | null;
  roomId: string | undefined;
  currentPlaylistSourceUrl: string;
}

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    ...buildTrackCard({ title: "Test Song", spotifyTrackUri: "spotify:track:TEST0001" }),
    releaseYear: 1984,
    sourceReleaseYear: 1984,
    metadataStatus: "imported",
    ...overrides,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function renderController(
  props: Partial<HookProps> = {},
  options: { currentPlaylistName?: string } = {},
) {
  const currentPlaylistNameRef: MutableRefObject<string | undefined> = {
    current: options.currentPlaylistName,
  };
  const setLoadedSavedPlaylistId = vi.fn();
  const setSavedPlaylistMessage = vi.fn();

  const hook = renderHook(
    (hookProps: HookProps) =>
      useSavedPlaylistsController({
        ...hookProps,
        currentPlaylistNameRef,
        setLoadedSavedPlaylistId,
        setSavedPlaylistMessage,
      }),
    {
      initialProps: {
        loadedSavedPlaylistId: null,
        roomId: TEST_ROOM_ID,
        currentPlaylistSourceUrl: "",
        ...props,
      },
      wrapper: Wrapper,
    },
  );

  return { ...hook, currentPlaylistNameRef, setLoadedSavedPlaylistId, setSavedPlaylistMessage };
}

async function flushSocket() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function respondWithCurrentTracks(tracks: PublicTrackInfo[]) {
  await flushSocket();
  act(() => {
    getSharedFakeSocket().serverEmit(ServerToClientEvent.PlaylistTracks, { tracks });
  });
  await flushSocket();
}

function seedSavedPlaylist(name: string, tracks: PublicTrackInfo[] = [buildTrack()]) {
  const saved = savePlaylist({ name, tracks });
  if (!saved) throw new Error("storage stub missing");
  return saved;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  resetSharedFakeSocket();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSavedPlaylistsController — initial state", () => {
  it("reads the saved playlists from storage on mount", () => {
    const saved = seedSavedPlaylist("Test Playlist");

    const { result } = renderController();

    expect(result.current.savedPlaylists).toEqual([saved]);
    expect(result.current.selectedSavedPlaylistId).toBe("");
    expect(result.current.isSavingWithName).toBe(false);
    expect(result.current.isOverwritePromptActive).toBe(false);
    expect(result.current.renamingPlaylistId).toBeNull();
  });
});

describe("useSavedPlaylistsController — saving", () => {
  it("does nothing without a room", async () => {
    const { result } = renderController({ roomId: undefined });

    act(() => result.current.saveCurrentPlaylist());
    await flushSocket();

    expect(getSharedFakeSocket().emitted).toEqual([]);
  });

  it("asks the server for the current tracks and reports an empty queue", async () => {
    const { result, setSavedPlaylistMessage } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([]);

    expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.GetPlaylistTracks)).toEqual([
      { roomId: TEST_ROOM_ID },
    ]);
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith("Import a playlist before saving.");
    expect(result.current.isSavingWithName).toBe(false);
  });

  it("opens the name prompt with the imported playlist name", async () => {
    const { result } = renderController({}, { currentPlaylistName: "Test Playlist" });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);

    expect(result.current.isSavingWithName).toBe(true);
    expect(result.current.saveName).toBe("Test Playlist");
  });

  it("falls back to a numbered default name when the playlist has no name", async () => {
    seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);

    expect(result.current.saveName).toBe("Saved playlist 2");
  });

  it("persists the playlist with its source URL, selects it and marks it loaded", async () => {
    const track = buildTrack();
    const { result, setLoadedSavedPlaylistId, setSavedPlaylistMessage } = renderController({
      currentPlaylistSourceUrl: SOURCE_URL,
    });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([track]);
    act(() => result.current.setSaveName("  Test Playlist  "));
    act(() => result.current.confirmSavePlaylist());

    const [stored] = listSavedPlaylists();
    expect(stored).toMatchObject({
      name: "Test Playlist",
      sourcePlaylistUrl: SOURCE_URL,
      tracks: [expect.objectContaining({ id: track.id, title: "Test Song" })],
    });
    expect(result.current.savedPlaylists).toEqual([stored]);
    expect(result.current.selectedSavedPlaylistId).toBe(stored?.id);
    expect(setLoadedSavedPlaylistId).toHaveBeenCalledWith(stored?.id);
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith("Playlist saved for later.");
    expect(result.current.isSavingWithName).toBe(false);
    expect(result.current.saveName).toBe("");
  });

  it("saves without a source URL when none is known", async () => {
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.confirmSavePlaylist());

    const [stored] = listSavedPlaylists();
    expect(stored?.name).toBe("Saved playlist 1");
    expect(stored).not.toHaveProperty("sourcePlaylistUrl");
  });

  it("uses the default name when the entered name is blank", async () => {
    const { result } = renderController({}, { currentPlaylistName: "Test Playlist" });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.setSaveName("   "));
    act(() => result.current.confirmSavePlaylist());

    expect(listSavedPlaylists()[0]?.name).toBe("Saved playlist 1");
  });

  it("rejects a duplicate name case-insensitively and clears the error on edit", async () => {
    seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.setSaveName("test playlist"));
    act(() => result.current.confirmSavePlaylist());

    expect(result.current.saveNameError).toBe("A saved playlist with this name already exists.");
    expect(result.current.isSavingWithName).toBe(true);
    expect(listSavedPlaylists()).toHaveLength(1);

    act(() => result.current.setSaveName("Test Playlist Two"));

    expect(result.current.saveNameError).toBeNull();
  });

  it("ignores a confirm without tracks waiting to be saved", () => {
    const { result, setSavedPlaylistMessage } = renderController();

    act(() => result.current.confirmSavePlaylist());

    expect(listSavedPlaylists()).toEqual([]);
    expect(setSavedPlaylistMessage).not.toHaveBeenCalled();
  });

  it("cancelling drops the pending tracks so a later confirm saves nothing", async () => {
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.setSaveName("Test Playlist"));
    act(() => result.current.cancelSavePlaylist());

    expect(result.current.isSavingWithName).toBe(false);
    expect(result.current.saveName).toBe("");

    act(() => result.current.confirmSavePlaylist());
    expect(listSavedPlaylists()).toEqual([]);
  });
});

describe("useSavedPlaylistsController — overwriting a loaded playlist", () => {
  it("prompts to overwrite and replaces the stored tracks on confirm", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const nextTrack = buildTrack({ id: "track-2", title: "Test Song Two" });
    const { result, setSavedPlaylistMessage } = renderController({
      loadedSavedPlaylistId: saved.id,
    });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([nextTrack]);

    expect(result.current.isOverwritePromptActive).toBe(true);
    expect(result.current.isSavingWithName).toBe(false);

    act(() => result.current.confirmOverwrite());

    expect(listSavedPlaylists()[0]?.tracks.map((track) => track.id)).toEqual(["track-2"]);
    expect(result.current.savedPlaylists[0]?.tracks[0]?.title).toBe("Test Song Two");
    expect(result.current.isOverwritePromptActive).toBe(false);
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith("Playlist overwritten.");
  });

  it("ignores an overwrite confirm without pending tracks", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, setSavedPlaylistMessage } = renderController({
      loadedSavedPlaylistId: saved.id,
    });

    act(() => result.current.confirmOverwrite());

    expect(listSavedPlaylists()).toEqual([saved]);
    expect(setSavedPlaylistMessage).not.toHaveBeenCalled();
  });

  it("ignores an overwrite confirm once the loaded playlist is gone", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, rerender, setSavedPlaylistMessage } = renderController({
      loadedSavedPlaylistId: saved.id,
    });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack({ id: "track-2" })]);
    rerender({ loadedSavedPlaylistId: null, roomId: TEST_ROOM_ID, currentPlaylistSourceUrl: "" });
    act(() => result.current.confirmOverwrite());

    expect(listSavedPlaylists()).toEqual([saved]);
    expect(setSavedPlaylistMessage).not.toHaveBeenCalled();
  });

  it("switches from the overwrite prompt to saving under a new name", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController({ loadedSavedPlaylistId: saved.id });

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.switchToSaveAsNew());

    expect(result.current.isOverwritePromptActive).toBe(false);
    expect(result.current.isSavingWithName).toBe(true);
    expect(result.current.saveName).toBe("Saved playlist 2");

    act(() => result.current.confirmSavePlaylist());
    expect(listSavedPlaylists().map((playlist) => playlist.name)).toEqual([
      "Saved playlist 2",
      "Test Playlist",
    ]);
  });

  it("offers the imported name when switching to save as new", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController(
      { loadedSavedPlaylistId: saved.id },
      { currentPlaylistName: "Test Playlist Remix" },
    );

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.switchToSaveAsNew());

    expect(result.current.saveName).toBe("Test Playlist Remix");
  });
});

describe("useSavedPlaylistsController — renaming", () => {
  it("starts a rename with the current name and ignores unknown ids", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.startRenamePlaylist("missing-playlist"));
    expect(result.current.renamingPlaylistId).toBeNull();

    act(() => result.current.startRenamePlaylist(saved.id));
    expect(result.current.renamingPlaylistId).toBe(saved.id);
    expect(result.current.renameInputValue).toBe("Test Playlist");
  });

  it("persists the new name and announces it", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, setSavedPlaylistMessage } = renderController();

    act(() => result.current.startRenamePlaylist(saved.id));
    act(() => result.current.setRenameInputValue("Test Playlist Renamed"));
    act(() => result.current.confirmRenamePlaylist());

    expect(listSavedPlaylists()[0]?.name).toBe("Test Playlist Renamed");
    expect(result.current.savedPlaylists[0]?.name).toBe("Test Playlist Renamed");
    expect(result.current.renamingPlaylistId).toBeNull();
    expect(result.current.renameInputValue).toBe("");
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith("Playlist renamed.");
  });

  it("keeps the same name when only its case changes", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.startRenamePlaylist(saved.id));
    act(() => result.current.setRenameInputValue("TEST PLAYLIST"));
    act(() => result.current.confirmRenamePlaylist());

    expect(result.current.renameError).toBeNull();
    expect(listSavedPlaylists()[0]?.name).toBe("TEST PLAYLIST");
  });

  it("rejects a name another playlist already uses and clears the error on edit", () => {
    seedSavedPlaylist("Test Playlist");
    const other = seedSavedPlaylist("Test Playlist Two");
    const { result } = renderController();

    act(() => result.current.startRenamePlaylist(other.id));
    act(() => result.current.setRenameInputValue(" test playlist "));
    act(() => result.current.confirmRenamePlaylist());

    expect(result.current.renameError).toBe("A saved playlist with this name already exists.");
    expect(result.current.renamingPlaylistId).toBe(other.id);
    expect(listSavedPlaylists().map((playlist) => playlist.name)).toEqual([
      "Test Playlist Two",
      "Test Playlist",
    ]);

    act(() => result.current.setRenameInputValue("Test Playlist Three"));
    expect(result.current.renameError).toBeNull();
  });

  it("cancelling leaves the stored name untouched", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.startRenamePlaylist(saved.id));
    act(() => result.current.setRenameInputValue("Test Playlist Renamed"));
    act(() => result.current.cancelRenamePlaylist());

    expect(result.current.renamingPlaylistId).toBeNull();
    expect(result.current.renameInputValue).toBe("");
    expect(listSavedPlaylists()[0]?.name).toBe("Test Playlist");
  });

  it("ignores a confirm when no rename is in progress", () => {
    seedSavedPlaylist("Test Playlist");
    const { result, setSavedPlaylistMessage } = renderController();

    act(() => result.current.confirmRenamePlaylist());

    expect(setSavedPlaylistMessage).not.toHaveBeenCalled();
  });
});

describe("useSavedPlaylistsController — loading a saved playlist", () => {
  it("sends the saved tracks and marks the playlist loaded once the server confirms", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, setLoadedSavedPlaylistId, setSavedPlaylistMessage } = renderController();
    const socket = getSharedFakeSocket();

    act(() => result.current.setSelectedSavedPlaylistId(saved.id));
    await flushSocket();

    expect(result.current.selectedSavedPlaylistId).toBe(saved.id);
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith(null);
    expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([
      { roomId: TEST_ROOM_ID, tracks: saved.tracks },
    ]);
    expect(setLoadedSavedPlaylistId).not.toHaveBeenCalled();

    act(() => socket.serverEmit(ServerToClientEvent.PlaylistTracks, { tracks: [] }));

    expect(setLoadedSavedPlaylistId).toHaveBeenCalledWith(saved.id);
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith(
      '"Test Playlist" loaded into this room.',
    );
    expect(socket.listenerCount(ServerToClientEvent.PlaylistTracks)).toBe(0);
  });

  it("closes an open save prompt when another playlist is selected", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.setSelectedSavedPlaylistId(saved.id));

    expect(result.current.isSavingWithName).toBe(false);
    expect(result.current.saveName).toBe("");

    act(() => result.current.confirmSavePlaylist());
    expect(listSavedPlaylists()).toEqual([saved]);
  });

  it("drops the previous load confirmation when the selection changes", async () => {
    const first = seedSavedPlaylist("Test Playlist");
    const second = seedSavedPlaylist("Test Playlist Two");
    const { result } = renderController();
    const socket = getSharedFakeSocket();
    const onceSpy = vi.spyOn(socket, "once");
    const offSpy = vi.spyOn(socket, "off");

    act(() => result.current.setSelectedSavedPlaylistId(first.id));
    await flushSocket();
    const firstConfirmation = onceSpy.mock.calls[0]?.[1];
    act(() => result.current.setSelectedSavedPlaylistId(second.id));
    await flushSocket();

    expect(firstConfirmation).toBeTypeOf("function");
    expect(offSpy).toHaveBeenCalledWith(ServerToClientEvent.PlaylistTracks, firstConfirmation);
    expect(socket.emittedFor(ClientToServerEvent.LoadCuratedPlaylist)).toEqual([
      { roomId: TEST_ROOM_ID, tracks: first.tracks },
      { roomId: TEST_ROOM_ID, tracks: second.tracks },
    ]);
  });

  it("clears the selection without loading when the empty option is chosen", async () => {
    const { result } = renderController();

    act(() => result.current.setSelectedSavedPlaylistId(""));
    await flushSocket();

    expect(result.current.selectedSavedPlaylistId).toBe("");
    expect(getSharedFakeSocket().emitted).toEqual([]);
  });

  it("does not load an unknown playlist", async () => {
    const { result } = renderController();

    act(() => result.current.setSelectedSavedPlaylistId("missing-playlist"));
    await flushSocket();

    expect(getSharedFakeSocket().emitted).toEqual([]);
  });

  it("does not load without a room", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController({ roomId: undefined });

    act(() => result.current.setSelectedSavedPlaylistId(saved.id));
    await flushSocket();

    expect(result.current.selectedSavedPlaylistId).toBe(saved.id);
    expect(getSharedFakeSocket().emitted).toEqual([]);
  });
});

describe("useSavedPlaylistsController — deleting", () => {
  it("does nothing when no playlist is selected", () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, setSavedPlaylistMessage } = renderController();

    act(() => result.current.deleteSelectedSavedPlaylist());

    expect(listSavedPlaylists()).toEqual([saved]);
    expect(setSavedPlaylistMessage).not.toHaveBeenCalled();
  });

  it("removes the selected playlist and selects the next remaining one", async () => {
    const first = seedSavedPlaylist("Test Playlist");
    const second = seedSavedPlaylist("Test Playlist Two");
    const { result, setLoadedSavedPlaylistId, setSavedPlaylistMessage } = renderController();

    act(() => result.current.setSelectedSavedPlaylistId(second.id));
    await flushSocket();
    act(() => result.current.deleteSelectedSavedPlaylist());

    expect(listSavedPlaylists()).toEqual([first]);
    expect(result.current.savedPlaylists).toEqual([first]);
    expect(result.current.selectedSavedPlaylistId).toBe(first.id);
    expect(setLoadedSavedPlaylistId).not.toHaveBeenCalled();
    expect(setSavedPlaylistMessage).toHaveBeenLastCalledWith("Saved playlist deleted.");
  });

  it("clears the loaded playlist and the selection when the last loaded one is deleted", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result, setLoadedSavedPlaylistId } = renderController({
      loadedSavedPlaylistId: saved.id,
    });

    act(() => result.current.setSelectedSavedPlaylistId(saved.id));
    await flushSocket();
    act(() => result.current.deleteSelectedSavedPlaylist());

    expect(setLoadedSavedPlaylistId).toHaveBeenCalledWith(null);
    expect(listSavedPlaylists()).toEqual([]);
    expect(result.current.selectedSavedPlaylistId).toBe("");
  });
});

describe("useSavedPlaylistsController — reset", () => {
  it("clears prompts and drops a pending load confirmation", async () => {
    const saved = seedSavedPlaylist("Test Playlist");
    const { result } = renderController();
    const socket = getSharedFakeSocket();
    const onceSpy = vi.spyOn(socket, "once");
    const offSpy = vi.spyOn(socket, "off");

    act(() => result.current.setSelectedSavedPlaylistId(saved.id));
    await flushSocket();
    const loadConfirmation = onceSpy.mock.calls[0]?.[1];
    act(() => result.current.startRenamePlaylist(saved.id));
    act(() => result.current.setRenameInputValue("Test Playlist Renamed"));

    act(() => result.current.resetSavedPlaylists());

    expect(loadConfirmation).toBeTypeOf("function");
    expect(offSpy).toHaveBeenCalledWith(ServerToClientEvent.PlaylistTracks, loadConfirmation);
    expect(result.current.renamingPlaylistId).toBeNull();
    expect(result.current.renameInputValue).toBe("");
    expect(result.current.renameError).toBeNull();
  });

  it("closes an open save prompt and forgets its pending tracks", async () => {
    const { result } = renderController();

    act(() => result.current.saveCurrentPlaylist());
    await respondWithCurrentTracks([buildTrack()]);
    act(() => result.current.setSaveName("Test Playlist"));

    act(() => result.current.resetSavedPlaylists());

    expect(result.current.isSavingWithName).toBe(false);
    expect(result.current.isOverwritePromptActive).toBe(false);
    expect(result.current.saveName).toBe("");

    act(() => result.current.confirmSavePlaylist());
    expect(listSavedPlaylists()).toEqual([]);
  });
});
