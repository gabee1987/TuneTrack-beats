import { ServerToClientEvent, type PublicTrackInfo } from "@tunetrack/shared";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSharedFakeSocket,
  resetSharedFakeSocket,
} from "../../../test/fakeSocket";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { PlaylistEditModal } from "./PlaylistEditModal";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => ({ roomId: "TEST_ROOM_1" }) };
});

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    id: "track-1",
    title: "Test Track One",
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 1984,
    sourceReleaseYear: 1984,
    metadataStatus: "imported",
    ...overrides,
  } as PublicTrackInfo;
}

async function renderOpenEditor(tracks: PublicTrackInfo[]) {
  const result = renderWithProviders(<PlaylistEditModal isOpen onClose={vi.fn()} />);

  await act(async () => {
    await Promise.resolve();
  });

  act(() => {
    socket.serverEmit(ServerToClientEvent.PlaylistTracks, { roomId: "TEST_ROOM_1", tracks });
  });

  return result;
}

describe("PlaylistEditModal", () => {
  beforeEach(() => {
    resetSharedFakeSocket();
  });

  it("requests the playlist tracks when opened", async () => {
    await renderOpenEditor([buildTrack()]);

    await waitFor(() => {
      expect(socket.emittedFor("get_playlist_tracks")).toEqual([{ roomId: "TEST_ROOM_1" }]);
    });
  });

  it("lists the imported tracks", async () => {
    await renderOpenEditor([
      buildTrack(),
      buildTrack({ id: "track-2", title: "Test Track Two", releaseYear: 1997 }),
    ]);

    expect(await screen.findByText("Test Track One")).toBeInTheDocument();
    expect(screen.getByText("Test Track Two")).toBeInTheDocument();
  });

  describe("song editor layering (defect B1)", () => {
    it("opens the song editor above the playlist sheet, not inside it", async () => {
      await renderOpenEditor([buildTrack()]);

      const openTrackButton = await screen.findByRole("button", { name: /^Test Track One/ });
      await userEvent.click(openTrackButton);

      // The details sheet is a <form>; find it by one of its fields rather than by role.
      const titleField = await screen.findByDisplayValue("Test Track One");
      const detailsSheet = titleField.closest("form");

      expect(detailsSheet, "song editor form should be rendered").not.toBeNull();

      // The playlist sheet is the element that holds the track list. If the song editor
      // is a descendant of it, the parent header paints over the editor's close button
      // and the editor cannot be dismissed -- which is the reported defect.
      const playlistSheet = openTrackButton.closest("[aria-modal='true']");
      expect(playlistSheet, "playlist sheet should exist").not.toBeNull();
      expect(
        playlistSheet?.contains(detailsSheet as Node),
        "song editor must not be nested inside the playlist sheet",
      ).toBe(false);
    });

    it("exposes a reachable close control on the song editor", async () => {
      await renderOpenEditor([buildTrack()]);

      await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));

      const titleField = await screen.findByDisplayValue("Test Track One");
      const detailsSheet = titleField.closest("form") as HTMLElement;

      const closeButton = within(detailsSheet).getByRole("button", { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue("Test Track One")).not.toBeInTheDocument();
      });
    });

    it("saves an edited release year and closes the editor", async () => {
      await renderOpenEditor([buildTrack()]);

      await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));

      const yearField = await screen.findByDisplayValue("1984");
      await userEvent.clear(yearField);
      await userEvent.type(yearField, "1979");

      const detailsSheet = yearField.closest("form") as HTMLElement;
      await userEvent.click(within(detailsSheet).getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(socket.emittedFor("update_playlist_track")).toEqual([
          expect.objectContaining({
            roomId: "TEST_ROOM_1",
            trackId: "track-1",
            releaseYear: 1979,
            metadataStatus: "edited",
          }),
        ]);
      });
    });
  });
});
