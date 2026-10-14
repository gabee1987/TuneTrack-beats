import { ClientToServerEvent, type PublicRoomSettings } from "@tunetrack/shared/client";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { buildRoomSettings, TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { LobbyPracticeDeckChoice } from "./LobbyPracticeDeckChoice";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

function renderChoice(settings: Partial<PublicRoomSettings> = {}) {
  return renderWithProviders(
    <Routes>
      <Route
        element={<LobbyPracticeDeckChoice currentSettings={buildRoomSettings(settings)} />}
        path="/lobby/:roomId"
      />
    </Routes>,
    { route: `/lobby/${TEST_ROOM_ID}` },
  );
}

describe("LobbyPracticeDeckChoice", () => {
  beforeEach(() => {
    resetSharedFakeSocket();
  });

  it("offers the practice deck while the room has no deck and asks the server for it", async () => {
    const user = userEvent.setup();
    renderChoice({ deckSource: "none" });

    const button = screen.getByRole("button", { name: "Use the practice deck" });
    expect(button).toHaveAccessibleDescription(
      "Built-in songs with no audio, for trying the game.",
    );
    await user.click(button);

    expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.UsePracticeDeck)).toEqual([
      expect.objectContaining({ roomId: TEST_ROOM_ID }),
    ]);
    expect(screen.getByRole("button", { name: "Loading the practice deck…" })).toBeDisabled();
  });

  it("says so when the server refuses the practice deck", async () => {
    const user = userEvent.setup();
    getSharedFakeSocket().respondToAck(ClientToServerEvent.UsePracticeDeck, {
      ok: false,
      code: "GAME_ALREADY_STARTED",
    });
    renderChoice({ deckSource: "none" });

    await user.click(screen.getByRole("button", { name: "Use the practice deck" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the practice deck. Try again.",
    );
    expect(screen.getByRole("button", { name: "Use the practice deck" })).toBeEnabled();
  });

  it("names the practice deck, its size and its silence once chosen", () => {
    renderChoice({ deckSource: "practice", importedTrackCount: 40, playlistImported: true });

    expect(screen.getByText("Practice deck · 40 songs · no audio")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("stays out of the way of a Spotify deck", () => {
    renderChoice({ deckSource: "spotify", importedTrackCount: 12, playlistImported: true });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/practice deck/i)).not.toBeInTheDocument();
  });
});
