import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TEST_GUEST_ID, buildLobbyRoomState, buildPlayer } from "../../../test/roomStateFixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { buildLobbyTestModel, practiceDeck, type LobbyTestModelOptions } from "../lobbyTestModel";
import { LobbyPageMobile } from "../mobile/LobbyPageMobile";
import { LobbyPageDesktop } from "./LobbyPageDesktop";

vi.mock("../hooks/spotify/useLobbySpotify", () => ({ useLobbySpotify: () => ({}) }));
vi.mock("../components/music/MusicSheet", () => ({ MusicSheet: () => null }));
vi.mock("../../../services/socket/socketClient", () => ({ resetSocketClient: vi.fn() }));
vi.mock("../../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

function renderLobby(options: LobbyTestModelOptions = {}) {
  const { controller, model } = buildLobbyTestModel(options);
  renderWithProviders(<LobbyPageDesktop model={model} />);
  return controller;
}

describe("LobbyPageDesktop host", () => {
  it("holds the one Start until there is a deck and says why", () => {
    renderLobby();

    const start = screen.getByRole("button", { name: "Start game" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Choose songs or use the practice deck first.");
    expect(screen.getByText("2 players · no songs yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Music Choose songs" })).toBeInTheDocument();
  });

  it("starts once the room has a deck", async () => {
    const controller = renderLobby({ settings: practiceDeck });

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(controller.handleStartGame).toHaveBeenCalledTimes(1);
  });

  it("shows the code with its actions and lists the players beside the cards", () => {
    const { container } = renderWithProviders(
      <LobbyPageDesktop model={buildLobbyTestModel().model} />,
    );

    expect(screen.getByLabelText("Room code T E S T _ R O O M _ 1")).toHaveTextContent(
      "TEST_ROOM_1",
    );
    expect(screen.getByRole("button", { name: "Change code" })).toBeEnabled();
    const aside = container.querySelector("aside");
    if (!aside) throw new Error("The desktop lobby has no aside.");
    expect(within(aside).getByRole("heading", { name: "Players (2)" })).toBeInTheDocument();
    expect(within(aside).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("edits the rules in a sheet with steppers, without a second player list", async () => {
    renderLobby();

    await userEvent.click(screen.getByRole("button", { name: /^Rules\b/ }));

    const sheet = screen.getByRole("dialog", { name: "Rules" });
    expect(within(sheet).getByRole("spinbutton", { name: "Songs to win" })).toBeInTheDocument();
    expect(within(sheet).queryByRole("slider")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("heading", { name: "Players (2)" })).not.toBeInTheDocument();
  });

  it("closes the room from Back after a confirmation", async () => {
    const controller = renderLobby();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    const dialog = screen.getByRole("dialog", { name: "Close the room?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Close room" }));

    expect(controller.handleCloseRoom).toHaveBeenCalledTimes(1);
  });

  it("changes the player's own name from the players card", async () => {
    const controller = renderLobby();

    await userEvent.click(screen.getByRole("button", { name: "Change your name" }));
    const field = screen.getByRole("textbox");
    await userEvent.clear(field);
    await userEvent.type(field, "Player Renamed{Enter}");

    expect(controller.handlePlayerProfileChange).toHaveBeenCalledWith("Player Renamed");
  });
});

describe("LobbyPageDesktop guest", () => {
  it("shows the room read-only and who starts it", () => {
    renderLobby({ currentPlayerId: TEST_GUEST_ID });

    expect(screen.getByRole("heading", { name: "You're in" })).toBeInTheDocument();
    expect(screen.getByText("The game starts when Player One taps Start.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Rules\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave room" })).toBeInTheDocument();
  });
});

describe("lobby Start control", () => {
  const assemblies = [
    ["phone", LobbyPageMobile],
    ["desktop", LobbyPageDesktop],
  ] as const;

  it.each(assemblies)("the %s lobby has exactly one Start for the host", (_, Assembly) => {
    const { model } = buildLobbyTestModel({
      roomState: buildLobbyRoomState({
        players: [
          buildPlayer(),
          buildPlayer({ id: TEST_GUEST_ID, displayName: "Player Two", isHost: false }),
        ],
      }),
      settings: practiceDeck,
    });
    renderWithProviders(<Assembly model={model} />);

    expect(screen.getAllByRole("button", { name: /^start game$/i })).toHaveLength(1);
  });
});
