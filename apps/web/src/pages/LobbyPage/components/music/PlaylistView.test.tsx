import { ServerToClientEvent, type PublicTrackInfo } from "@tunetrack/shared/client";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionFeatureProvider } from "../../../../features/motion";
import { Overlay } from "../../../../features/overlay";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../../../test/renderOnHistoryRoute";
import type {
  PlaylistEditorFilter,
  PlaylistEditorSource,
} from "../../hooks/music/playlistEditorTarget";
import type { PlaylistViewModel } from "../../hooks/music/usePlaylistView";
import { useRoomDeckTracks } from "../../hooks/music/useRoomDeckTracks";
import { PlaylistView } from "./PlaylistView";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
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

function buildView(
  source: PlaylistEditorSource,
  overrides: Partial<PlaylistViewModel> = {},
): PlaylistViewModel {
  return {
    useHeldReason: null,
    error: null,
    initialFilter: "all",
    isBusy: false,
    kind: "room",
    listKey: "room",
    membership: null,
    name: "In this game",
    onBack: () => undefined,
    onUse: null,
    source,
    sourceLabel: null,
    ...overrides,
  };
}

/** The view over the Music sheet, on the room deck. */
function RoomDeckScreen({ initialFilter = "all" }: { initialFilter?: PlaylistEditorFilter }) {
  const [isOpen, setIsOpen] = useState(true);
  const source = useRoomDeckTracks(true, "TEST_DECK");

  // The animation features load as on the page, so exits run and must finish.
  return (
    <MotionFeatureProvider>
      <p>Lobby screen</p>
      <Overlay isOpen kind="sheet" label="Spotify music setup" onDismiss={() => undefined}>
        <p>Music setup</p>
        <PlaylistView
          view={
            isOpen ? buildView(source, { initialFilter, onBack: () => setIsOpen(false) }) : null
          }
        />
      </Overlay>
    </MotionFeatureProvider>
  );
}

/**
 * A finger dragged sideways over a row. jsdom has no PointerEvent, and a plain Event would drop
 * the position React reads, so the pointer events travel as mouse events (as in `RangeField`).
 */
function swipeRow(row: HTMLElement, distance: number) {
  const send = (type: string, clientX: number) =>
    fireEvent(row, new MouseEvent(type, { bubbles: true, clientX, clientY: 20 }));
  send("pointerdown", 200);
  for (let step = 1; step <= 4; step++) send("pointermove", 200 + (distance * step) / 4);
  send("pointerup", 200 + distance);
}

async function renderRoomDeck(
  tracks: PublicTrackInfo[],
  options: { initialFilter?: PlaylistEditorFilter } = {},
) {
  const router = renderOnHistoryRoute(<RoomDeckScreen {...options} />);

  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    socket.serverEmit(ServerToClientEvent.PlaylistTracks, { roomId: "TEST_ROOM_1", tracks });
  });

  return router;
}

function renderList(view: PlaylistViewModel) {
  renderOnHistoryRoute(<PlaylistView view={view} />);
}

function listSource(tracks: PublicTrackInfo[]): PlaylistEditorSource {
  return { isLoading: false, removeTracks: vi.fn(), tracks, updateTrack: vi.fn() };
}

describe("PlaylistView on the room deck", () => {
  beforeAll(installRouterRequestStub);

  beforeEach(() => {
    resetSharedFakeSocket();
  });

  it("asks the server for the deck and lists its songs under one header", async () => {
    await renderRoomDeck([
      buildTrack(),
      buildTrack({ id: "track-2", title: "Test Track Two", releaseYear: 1997 }),
    ]);

    expect(socket.emittedFor("get_playlist_tracks")).toEqual([{ roomId: "TEST_ROOM_1" }]);
    expect(await screen.findByText("Test Track One")).toBeInTheDocument();
    expect(screen.getByText("Test Track Two")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit the songs" })).toBeInTheDocument();
    expect(screen.getByText("2 songs")).toBeInTheDocument();
  });

  it("says the deck is in the game instead of offering to use it", async () => {
    await renderRoomDeck([buildTrack()]);

    expect(await screen.findByRole("button", { name: "In this game ✓" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Use in game" })).not.toBeInTheDocument();
  });

  describe("song editor layering (defect B1)", () => {
    it("opens the song editor beside the list, not inside it", async () => {
      await renderRoomDeck([buildTrack()]);

      const openTrackButton = await screen.findByRole("button", { name: /^Test Track One/ });
      await userEvent.click(openTrackButton);

      const detailsSheet = (await screen.findByDisplayValue("Test Track One")).closest("form");
      expect(detailsSheet, "song editor form should be rendered").not.toBeNull();
      const playlistView = openTrackButton.closest("[aria-modal='true']");
      expect(playlistView?.contains(detailsSheet as Node)).toBe(false);
    });

    it("leaves the song editor from its Back button", async () => {
      await renderRoomDeck([buildTrack()]);

      await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));
      const detailsSheet = (await screen.findByDisplayValue("Test Track One")).closest(
        "form",
      ) as HTMLElement;
      await userEvent.click(within(detailsSheet).getByRole("button", { name: "Back" }));

      await waitFor(() => {
        expect(screen.queryByDisplayValue("Test Track One")).not.toBeInTheDocument();
      });
    });

    it("saves an edited release year", async () => {
      await renderRoomDeck([buildTrack()]);

      await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));
      const yearField = await screen.findByDisplayValue("1984");
      await userEvent.clear(yearField);
      await userEvent.type(yearField, "1979");
      await userEvent.click(
        within(yearField.closest("form") as HTMLElement).getByRole("button", { name: /save/i }),
      );

      await waitFor(() => {
        expect(socket.emittedFor("update_playlist_track")).toEqual([
          expect.objectContaining({
            metadataStatus: "edited",
            releaseYear: 1979,
            roomId: "TEST_ROOM_1",
            trackId: "track-1",
          }),
        ]);
      });
    });
  });

  it("shows the server's copy of an edited track from the single-track reply (05 A10)", async () => {
    await renderRoomDeck([
      buildTrack(),
      buildTrack({ id: "track-2", title: "Test Track Two", releaseYear: 1997 }),
    ]);
    expect(await screen.findByText("Test Track One")).toBeInTheDocument();

    act(() => {
      socket.serverEmit(ServerToClientEvent.PlaylistTrackUpdated, {
        track: buildTrack({ title: "Test Track One (Corrected)", metadataStatus: "edited" }),
      });
    });

    expect(await screen.findByText("Test Track One (Corrected)")).toBeInTheDocument();
    expect(screen.getByText("Test Track Two")).toBeInTheDocument();
  });

  it("closes the song editor and then the list in browser-back order", async () => {
    const router = await renderRoomDeck([buildTrack()]);

    await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));
    await screen.findByDisplayValue("Test Track One");

    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => {
      expect(screen.queryByDisplayValue("Test Track One")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: "Song list" })).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Song list" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Lobby screen")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Spotify music setup" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("opens on the songs to check and brings the rest back with All", async () => {
    const flaggedTrack = buildTrack({
      albumTitle: "Test Album (Remastered)",
      id: "track-2",
      releaseYear: 2011,
      title: "Test Track Two",
    });
    await renderRoomDeck([buildTrack(), flaggedTrack], { initialFilter: "needsCheck" });

    expect(await screen.findByText("Test Track Two")).toBeInTheDocument();
    expect(screen.queryByText("Test Track One")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review 1 to check" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Needs check (1)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "All (2)" }));
    expect(screen.getByText("Test Track One")).toBeInTheDocument();
  });

  it("sorts from one select and goes back to the deck's own order", async () => {
    await renderRoomDeck([
      buildTrack({ id: "track-1", releaseYear: 1999, title: "Test Track One" }),
      buildTrack({ id: "track-2", releaseYear: 1975, title: "Test Track Two" }),
    ]);
    await screen.findByText("Test Track One");
    const titles = () =>
      screen.getAllByText(/^Test Track (One|Two)$/).map((title) => title.textContent);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "Oldest first");
    expect(titles()).toEqual(["Test Track Two", "Test Track One"]);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "Playlist order");
    expect(titles()).toEqual(["Test Track One", "Test Track Two"]);
  });

  it("removes the selected songs from one button that names how many", async () => {
    await renderRoomDeck([buildTrack(), buildTrack({ id: "track-2", title: "Test Track Two" })]);

    await userEvent.click(await screen.findByRole("button", { name: "Select Test Track Two" }));
    const bar = screen.getByRole("toolbar", { name: "1 selected" });
    expect(within(bar).getAllByRole("button")).toHaveLength(1);
    await userEvent.click(within(bar).getByRole("button", { name: "Remove 1" }));

    expect(socket.emittedFor("remove_playlist_tracks")).toEqual([
      expect.objectContaining({ trackIds: ["track-2"] }),
    ]);
  });

  it("leaves after a checked song dropped out of the Needs check list", async () => {
    const flagged = (id: string, title: string) =>
      buildTrack({ albumTitle: "Test Album (Remastered)", id, title });
    await renderRoomDeck(
      [flagged("track-1", "Test Track One"), flagged("track-2", "Test Track Two")],
      { initialFilter: "needsCheck" },
    );

    await userEvent.click(await screen.findByRole("button", { name: /^Test Track One/ }));
    await userEvent.click(await screen.findByRole("switch", { name: "Year checked" }));
    await userEvent.click(screen.getByRole("button", { name: "Save song" }));
    await waitFor(() => expect(screen.queryByDisplayValue("Test Track One")).toBeNull());
    expect(screen.queryByText("Test Track One")).toBeNull();

    const view = screen.getByRole("dialog", { name: "Song list" });
    await userEvent.click(within(view).getAllByRole("button", { name: "Back" })[0] as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Song list" })).toBeNull());
  });

  it("deletes a song swiped left, and a short swipe keeps it", async () => {
    Element.prototype.setPointerCapture = vi.fn();
    await renderRoomDeck([buildTrack(), buildTrack({ id: "track-2", title: "Test Track Two" })]);
    const rowOf = async (name: RegExp) =>
      (await screen.findByRole("button", { name })).closest("[data-swipe-row]") as HTMLElement;

    swipeRow(await rowOf(/^Test Track One/), -40);
    swipeRow(await rowOf(/^Test Track Two/), -160);

    await waitFor(() => {
      expect(socket.emittedFor("remove_playlist_tracks")).toEqual([
        expect.objectContaining({ trackIds: ["track-2"] }),
      ]);
    });
    expect(screen.getByText("Test Track One")).toBeInTheDocument();
  });

  it("folds the big cover into the bar as the list scrolls", async () => {
    await renderRoomDeck([buildTrack()]);
    await screen.findByText("Test Track One");
    const view = screen.getByRole("dialog", { name: "Song list" });
    // The bar holds the header; the scroller follows it.
    const scroller = view.querySelector("header")?.parentElement?.nextElementSibling;
    const compactCover = view.querySelector("header")?.querySelector("span[style]");
    expect(compactCover).toHaveStyle({ opacity: "0" });

    await act(async () => {
      (scroller as HTMLElement).scrollTop = 400;
      fireEvent.scroll(scroller as HTMLElement);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    await waitFor(() => expect(compactCover).toHaveStyle({ opacity: "1" }));
  });

  it("shows the deck's song cover in its header", async () => {
    const cover = "https://images.example.test/TEST_COVER_1.jpg";
    await renderRoomDeck([buildTrack({ artworkUrl: cover })]);
    await screen.findByText("Test Track One");

    const header = screen.getByRole("dialog", { name: "Song list" }).querySelector("header");
    expect(header?.querySelector(`img[src="${cover}"]`)).not.toBeNull();
  });
});

describe("PlaylistView on other lists", () => {
  beforeAll(installRouterRequestStub);

  it("edits a saved deck through its own source and offers to use it", async () => {
    const source = listSource([buildTrack()]);
    const onUse = vi.fn();
    renderList(
      buildView(source, {
        kind: "saved",
        listKey: "saved:TEST_DECK_1",
        name: "Test Deck",
        onUse,
        sourceLabel: "Saved deck",
      }),
    );

    expect(screen.getByRole("heading", { name: "Edit the songs" })).toBeInTheDocument();
    expect(screen.getByText("Test Deck")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use in game" }));
    expect(onUse).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /^Test Track One/ }));
    const yearField = await screen.findByDisplayValue("1984");
    await userEvent.clear(yearField);
    await userEvent.type(yearField, "1979");
    await userEvent.click(
      within(yearField.closest("form") as HTMLElement).getByRole("button", { name: /save/i }),
    );

    expect(source.updateTrack).toHaveBeenCalledWith(
      "track-1",
      expect.objectContaining({ releaseYear: 1979 }),
    );
  });

  it("adds a found song in place and adds or removes a selection from two buttons", async () => {
    const inGame = new Set(["track-2"]);
    const add = vi.fn();
    const remove = vi.fn();
    renderList(
      buildView(
        listSource([buildTrack(), buildTrack({ id: "track-2", title: "Test Track Two" })]),
        {
          kind: "spotify",
          listKey: "spotify:TEST_PLAYLIST_1",
          membership: { add, isInGame: (trackId) => inGame.has(trackId), remove },
          name: "Test Playlist",
          onUse: vi.fn(),
          sourceLabel: "Test Owner",
        },
      ),
    );

    expect(screen.getByRole("heading", { name: "Pick the songs" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add Test Track One" }));
    expect(add).toHaveBeenCalledWith(new Set(["track-1"]));

    // A swipe right adds, as Spotify adds to the queue; the row stays.
    Element.prototype.setPointerCapture = vi.fn();
    add.mockClear();
    const row = screen
      .getByRole("button", { name: /^Test Track One/ })
      .closest("[data-swipe-row]") as HTMLElement;
    swipeRow(row, 160);
    await waitFor(() => expect(add).toHaveBeenCalledWith(new Set(["track-1"])));
    expect(screen.getByText("Test Track One")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Select Test Track One" }));
    await userEvent.click(screen.getByRole("button", { name: "Select Test Track Two" }));
    const bar = screen.getByRole("toolbar", { name: "2 selected" });
    await userEvent.click(within(bar).getByRole("button", { name: "Remove 1" }));
    expect(remove).toHaveBeenCalledWith(new Set(["track-2"]));
  });

  it("uses a quick pick's selected songs, or removes them from the pick", async () => {
    const onUse = vi.fn();
    const source = listSource([
      buildTrack(),
      buildTrack({ id: "track-2", title: "Test Track Two" }),
    ]);
    renderList(
      buildView(source, {
        useHeldReason: "A game needs at least 10 songs.",
        kind: "quickPick",
        listKey: "quickPick:TEST_SESSION_1",
        name: "Your quick pick",
        onUse,
        sourceLabel: "Quick pick",
      }),
    );

    const useAll = screen.getByRole("button", { name: "Use in game" });
    expect(useAll).toBeDisabled();
    expect(useAll).toHaveAccessibleDescription("A game needs at least 10 songs.");
    await userEvent.click(screen.getByRole("button", { name: "Select Test Track Two" }));
    const bar = screen.getByRole("toolbar", { name: "1 selected" });
    await userEvent.click(within(bar).getByRole("button", { name: "Use 1 selected" }));
    expect(onUse).toHaveBeenCalledWith(new Set(["track-2"]));

    await userEvent.click(within(bar).getByRole("button", { name: "Remove 1" }));
    expect(source.removeTracks).toHaveBeenCalledWith(["track-2"]);
  });

  it("steps the year by one, names Spotify's year once it differs, and checks the year", async () => {
    const source = listSource([buildTrack({ sourceReleaseYear: 1984 })]);
    renderList(
      buildView(source, { kind: "saved", listKey: "saved:TEST_DECK_1", name: "Test Deck" }),
    );

    await userEvent.click(screen.getByRole("button", { name: /^Test Track One/ }));
    const editor = (await screen.findByDisplayValue("1984")).closest("form") as HTMLElement;
    expect(within(editor).queryByText(/Spotify album year/)).not.toBeInTheDocument();
    await userEvent.click(within(editor).getByRole("button", { name: "Decrease Release year" }));
    expect(within(editor).getByText("Spotify album year: 1984")).toBeInTheDocument();
    await userEvent.click(within(editor).getByRole("switch", { name: "Year checked" }));
    await userEvent.click(within(editor).getByRole("button", { name: "Save song" }));

    expect(source.updateTrack).toHaveBeenCalledWith("track-1", {
      metadataStatus: "verified",
      releaseYear: 1983,
    });
  });

  it("reviews the flagged songs one after another and saves each answer", async () => {
    const flagged = (id: string, title: string) =>
      buildTrack({ albumTitle: "Test Album (Remastered)", id, title });
    const source = listSource([
      flagged("track-1", "Test Track One"),
      buildTrack({ id: "track-2", metadataStatus: "verified", title: "Test Track Two" }),
      flagged("track-3", "Test Track Three"),
    ]);
    renderList(
      buildView(source, { kind: "saved", listKey: "saved:TEST_DECK_1", name: "Test Deck" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Review 2 to check" }));
    expect(await screen.findByDisplayValue("Test Track One")).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(source.updateTrack).toHaveBeenCalledWith("track-1", { metadataStatus: "verified" });

    expect(await screen.findByDisplayValue("Test Track Three")).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(source.updateTrack).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByDisplayValue("Test Track Three")).not.toBeInTheDocument();
    });
  });

  it("says why an opened list has no songs", () => {
    renderList(
      buildView(listSource([]), {
        error: "Spotify playlist could not be opened.",
        kind: "spotify",
        listKey: "spotify:error",
        name: "Opening playlist…",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Spotify playlist could not be opened.");
  });
});
