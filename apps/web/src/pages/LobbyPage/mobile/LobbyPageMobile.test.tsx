import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicRoomSettings, PublicRoomState } from "@tunetrack/shared/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TEST_GUEST_ID,
  TEST_HOST_ID,
  buildLobbyRoomState,
  buildPlayer,
  buildRoomSettings,
} from "../../../test/roomStateFixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import type { LobbyPageController } from "../LobbyPage.types";
import { buildLobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { selectLobbySetup } from "../hooks/lobbySetupModel";
import { resetSocketClient } from "../../../services/socket/socketClient";
import { LobbyPageMobile } from "./LobbyPageMobile";

vi.mock("../hooks/spotify/useLobbySpotify", () => ({ useLobbySpotify: () => ({}) }));
vi.mock("../components/spotify/LobbyMusicSetup", () => ({ LobbyMusicSetup: () => null }));
vi.mock("../../../services/socket/socketClient", () => ({ resetSocketClient: vi.fn() }));
vi.mock("../../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

const practiceDeck: Partial<PublicRoomSettings> = {
  deckSource: "practice",
  importedTrackCount: 60,
};

interface RenderOptions {
  currentPlayerId?: string;
  roomState?: PublicRoomState | null;
  settings?: Partial<PublicRoomSettings>;
}

function renderLobby({
  currentPlayerId = TEST_HOST_ID,
  roomState,
  settings = {},
}: RenderOptions = {}) {
  const currentSettings = buildRoomSettings(settings);
  const resolvedRoomState =
    roomState === undefined ? buildLobbyRoomState({ settings: currentSettings }) : roomState;
  const controller = {
    closeRoomActionStatus: "idle",
    handleCloseRoom: vi.fn(),
    handleRoomSettingsChange: vi.fn(),
    currentPlayerId,
    currentSettings,
    displayName: "Player One",
    errorCode: null,
    errorMessage: null,
    handlePlayerProfileChange: vi.fn(async () => true),
    handleRoomRename: vi.fn(async () => true),
    handleStartGame: vi.fn(),
    identityActionState: null,
    isHost: resolvedRoomState?.hostId === currentPlayerId || resolvedRoomState === null,
    isIdentityActionPending: false,
    preloadGame: vi.fn(),
    roomId: resolvedRoomState?.roomId,
    roomState: resolvedRoomState,
    startGameActionStatus: "idle",
  } as unknown as LobbyPageController;
  const setup = selectLobbySetup({
    connectionStatus: "connected",
    currentPlayerId,
    roomState: resolvedRoomState,
    settings: currentSettings,
    startGameActionStatus: "idle",
  });

  renderWithProviders(<LobbyPageMobile model={buildLobbyAssemblyModel(controller, setup)} />);
  return controller;
}

const stubbedNavigatorKeys: string[] = [];

/** Only the browser APIs under test; `navigator` itself keeps its getters (language, …). */
function stubNavigator(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { configurable: true, value });
    stubbedNavigatorKeys.push(key);
  }
}

afterEach(() => {
  for (const key of stubbedNavigatorKeys.splice(0)) {
    Reflect.deleteProperty(navigator, key);
  }
});

describe("LobbyPageMobile host", () => {
  it("holds Start until there is a deck and says why", () => {
    renderLobby();

    const start = screen.getByRole("button", { name: "Start game" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Choose songs or use the practice deck first.");
    expect(screen.getByText("2 players · no songs yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Music Choose songs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use the practice deck" })).toBeInTheDocument();
  });

  it("shows the deck on the Music card and starts once the room has one", async () => {
    const controller = renderLobby({ settings: practiceDeck });

    expect(
      screen.getByRole("button", { name: "Music Practice deck · 60 songs · no audio" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use the practice deck" })).not.toBeInTheDocument();
    expect(screen.getByText("2 players · 60 songs")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(controller.handleStartGame).toHaveBeenCalledTimes(1);
  });

  it("shows the code skeleton and a creating reason, never a fallback code, while the room is made", () => {
    renderLobby({ roomState: null });

    expect(screen.getByRole("status", { name: "Creating your room…" })).toBeInTheDocument();
    expect(screen.queryByText("lobby")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start game" })).toHaveAccessibleDescription(
      "Creating your room…",
    );
  });

  it("waits for friends while alone and calls a solo start a practice round", () => {
    renderLobby({
      roomState: buildLobbyRoomState({ players: [buildPlayer()] }),
      settings: { ...practiceDeck, importedTrackCount: 20 },
    });

    expect(screen.getByText("Waiting for friends to join…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start game" })).toHaveAccessibleDescription(
      "You're the only player — fine for a practice round.",
    );
  });

  it("warns about a short deck on the meter and at Start", () => {
    renderLobby({ settings: { ...practiceDeck, importedTrackCount: 12 } });
    const shortDeck = "Short deck: 12 of 19 songs needed for 2 players to reach 10";

    expect(screen.getByRole("meter", { name: "Songs in the deck" })).toHaveAttribute(
      "aria-valuenow",
      "12",
    );
    expect(screen.getAllByText(shortDeck)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Start game" })).toBeEnabled();
  });

  it("spells the code for screen readers and copies an invite where sharing is missing", async () => {
    const writeText = vi.fn(async () => undefined);
    stubNavigator({ clipboard: { writeText }, share: undefined });
    renderLobby();

    expect(screen.getByLabelText("Room code T E S T _ R O O M _ 1")).toHaveTextContent(
      "TEST_ROOM_1",
    );
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Copy invite" }));

    expect(writeText).toHaveBeenCalledWith(
      `Join my TuneTrack game: TEST_ROOM_1\n${window.location.origin}/join/TEST_ROOM_1`,
    );
    expect(await screen.findByText("Invite copied")).toBeInTheDocument();
  });

  it("copies the bare code and offers Share where the browser can share", async () => {
    const writeText = vi.fn(async () => undefined);
    const share = vi.fn(async () => undefined);
    stubNavigator({ clipboard: { writeText }, share });
    renderLobby();

    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(writeText).toHaveBeenCalledWith("TEST_ROOM_1");
    expect(share).toHaveBeenCalledWith({
      text: "Join my TuneTrack game: TEST_ROOM_1",
      title: "TuneTrack",
      url: `${window.location.origin}/join/TEST_ROOM_1`,
    });
  });

  it("changes the name from the own chip, which reads You", async () => {
    const controller = renderLobby();
    const players = screen.getByRole("list", { name: "Players (2)" });

    expect(within(players).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(
      within(players).getByRole("button", { name: /Player One \(you\).*Host.*Change your name/ }),
    );
    const field = screen.getByRole("textbox", { name: "Your name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Player Three{Enter}");

    expect(controller.handlePlayerProfileChange).toHaveBeenCalledWith("Player Three");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renames the room, refusing a code that differs only in case", async () => {
    const controller = renderLobby();

    await userEvent.click(screen.getByRole("button", { name: "Change code" }));
    const field = screen.getByRole("textbox", { name: "Room code" });
    await userEvent.clear(field);
    await userEvent.type(field, "test_room_1");

    expect(screen.getByRole("alert")).toHaveTextContent("Codes match in any case");
    expect(screen.getByRole("button", { name: "Rename room" })).toBeDisabled();

    await userEvent.clear(field);
    await userEvent.type(field, "TEST_ROOM_2{Enter}");

    expect(controller.handleRoomRename).toHaveBeenCalledWith("TEST_ROOM_2");
  });

  it("opens the rules from the Rules card, with one way out and a reset once a rule changed", async () => {
    const controller = renderLobby({ settings: { targetTimelineCardCount: 12 } });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Rules 12 songs to win · 1 to start · tokens on, Beat! 10 s",
      }),
    );
    const sheet = screen.getByRole("dialog", { name: "Rules" });

    expect(sheet).toHaveTextContent("Changes apply right away for everyone in the room.");
    expect(within(sheet).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Close room/i })).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Reset to defaults" }));

    expect(controller.handleRoomSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ targetTimelineCardCount: 10, ttModeEnabled: true }),
    );
  });

  it("keeps Reset to defaults off while the rules are the defaults", async () => {
    renderLobby();

    await userEvent.click(screen.getByRole("button", { name: /^Rules/ }));

    expect(screen.getByRole("button", { name: "Reset to defaults" })).toBeDisabled();
  });

  it("closes the room from Back after a confirmation", async () => {
    const controller = renderLobby();

    await userEvent.click(screen.getByRole("button", { name: "Close room" }));
    const dialog = screen.getByRole("dialog", { name: "Close the room?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Close room" }));

    expect(controller.handleCloseRoom).toHaveBeenCalledTimes(1);
  });
});

describe("LobbyPageMobile guest", () => {
  it("shows the room read-only and who starts it", () => {
    renderLobby({ currentPlayerId: TEST_GUEST_ID });

    expect(screen.getByRole("heading", { name: "You're in" })).toBeInTheDocument();
    expect(screen.getByText("The game starts when Player One taps Start.")).toBeInTheDocument();
    expect(screen.getByText("Player One is choosing songs")).toBeInTheDocument();
    expect(
      screen.getByText("10 songs to win · 1 to start · tokens on, Beat! 10 s"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Rules/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave room" })).toBeInTheDocument();
  });

  it("leaves the room from Back after a confirmation", async () => {
    renderLobby({ currentPlayerId: TEST_GUEST_ID });

    await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
    const dialog = screen.getByRole("dialog", { name: "Leave the room?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Leave" }));

    await waitFor(() => expect(resetSocketClient).toHaveBeenCalledTimes(1));
  });

  it("says where the music will play once the host chose a deck", () => {
    renderLobby({ currentPlayerId: TEST_GUEST_ID, settings: practiceDeck });

    expect(screen.getByText("60 songs · plays on Player One's phone")).toBeInTheDocument();
  });
});
