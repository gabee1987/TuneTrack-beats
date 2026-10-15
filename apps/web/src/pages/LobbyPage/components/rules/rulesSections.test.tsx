import { fireEvent, screen, within } from "@testing-library/react";
import type { PublicPlayerState, PublicRoomSettings } from "@tunetrack/shared/client";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import {
  TEST_GUEST_ID,
  TEST_HOST_ID,
  buildPlayer,
  buildRoomSettings,
} from "../../../../test/roomStateFixtures";
import type { LobbyAssemblyModel } from "../../hooks/buildLobbyAssemblyModel";
import { RulesGameSection } from "./RulesGameSection";
import type { RulesNumberInput } from "./RulesNumberSetting";
import { RulesPlayersSection } from "./RulesPlayersSection";
import { RulesTokensSection } from "./RulesTokensSection";

const HOST = buildPlayer();
const GUEST = buildPlayer({ displayName: "Player Two", id: TEST_GUEST_ID, isHost: false });

function renderGame(numberInput: RulesNumberInput, settings = buildRoomSettings()) {
  const onChange = vi.fn<(next: PublicRoomSettings) => void>();
  renderWithProviders(
    <RulesGameSection
      disabled={false}
      numberInput={numberInput}
      onChange={onChange}
      settings={settings}
    />,
  );
  return onChange;
}

function renderTokens(settings: Partial<PublicRoomSettings> = {}) {
  const onChange = vi.fn<(next: PublicRoomSettings) => void>();
  const onToggleTokens = vi.fn<(isOn: boolean) => void>();
  renderWithProviders(
    <RulesTokensSection
      disabled={false}
      numberInput="ruler"
      onChange={onChange}
      onToggleTokens={onToggleTokens}
      settings={buildRoomSettings(settings)}
    />,
  );
  return { onChange, onToggleTokens };
}

function renderPlayers(
  overrides: Partial<LobbyAssemblyModel["players"]> = {},
  players: PublicPlayerState[] = [HOST, GUEST],
) {
  const model: LobbyAssemblyModel["players"] = {
    currentPlayerId: TEST_HOST_ID,
    isHost: true,
    isKickPlayerPending: false,
    isPlayerSettingsPending: false,
    kickPlayerActionState: null,
    onPlayerKick: vi.fn(),
    onPlayerStartingCardCountChange: vi.fn(),
    onPlayerStartingTtTokenCountChange: vi.fn(),
    playerSettingsActionState: null,
    players,
    roomSettings: buildRoomSettings(),
    ...overrides,
  };
  renderWithProviders(<RulesPlayersSection numberInput="ruler" players={model} />);
  return model;
}

function getRow(name: string) {
  const row = screen
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(name, { exact: true }) !== null);
  if (!row) throw new Error(`No player row for ${name}.`);
  return within(row);
}

describe("Rules sheet · Game", () => {
  it("shows each number on a described ruler on phones", () => {
    const onChange = renderGame("ruler");

    expect(screen.getByRole("heading", { name: "Game" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Songs to win" })).toHaveAttribute(
      "aria-valuenow",
      "10",
    );
    expect(
      screen.getByText("The first player with this many songs on their timeline wins."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Songs to start with: 3" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultStartingTimelineCardCount: 3 }),
    );
  });

  it("uses an editable stepper on desktop", () => {
    const onChange = renderGame("stepper");
    const target = screen.getByRole("spinbutton", { name: "Songs to win" });

    fireEvent.change(target, { target: { value: "15" } });
    fireEvent.keyDown(target, { key: "Enter" });

    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ targetTimelineCardCount: 15 }));
  });

  it("sets who taps Next with a two-way segmented control", () => {
    const onChange = renderGame("ruler");
    const group = screen.getByRole("radiogroup", { name: "Who taps Next" });

    expect(within(group).getByRole("radio", { name: "Host" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(within(group).getByRole("radio", { name: "Host or player on turn" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ revealConfirmMode: "host_or_active_player" }),
    );
  });
});

describe("Rules sheet · Tokens", () => {
  it("keeps the token settings closed and out of reach while tokens are off", () => {
    const { onToggleTokens } = renderTokens({ ttModeEnabled: false });
    const beatWindow = screen.getByRole("radiogroup", { hidden: true });

    expect(beatWindow.closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Beat! window" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Tokens" }));

    expect(onToggleTokens).toHaveBeenCalledWith(true);
  });

  it("offers 5 to 30 second Beat! windows and no unlimited one", () => {
    const { onChange } = renderTokens({ challengeWindowDurationSeconds: 10, ttModeEnabled: true });
    const group = screen.getByRole("radiogroup", { name: "Beat! window" });

    expect(group.closest("[inert]")).toBeNull();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["5 s", "10 s", "15 s", "30 s"]);
    fireEvent.click(within(group).getByRole("radio", { name: "30 s" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ challengeWindowDurationSeconds: 30 }),
    );
  });

  it("keeps showing a room's existing unlimited window as selected", () => {
    renderTokens({ challengeWindowDurationSeconds: null, ttModeEnabled: true });

    expect(screen.getByRole("radio", { name: "No limit" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("Rules sheet · Players", () => {
  it("names each player with their role and starting songs as text", () => {
    renderPlayers({}, [
      HOST,
      { ...GUEST, connectionStatus: "disconnected", startingTimelineCardCount: 1 },
    ]);

    expect(screen.getByRole("heading", { name: "Players (2)" })).toBeInTheDocument();
    expect(getRow("Player One").getByText("Host · You · Starts with 1 song")).toBeInTheDocument();
    expect(getRow("Player Two").getByText("Offline · Starts with 1 song")).toBeInTheDocument();
  });

  it("adds the starting tokens when tokens are on", () => {
    renderPlayers({ roomSettings: buildRoomSettings({ ttModeEnabled: true }) }, [
      HOST,
      { ...GUEST, startingTimelineCardCount: 2, ttTokenCount: 3 },
    ]);

    expect(getRow("Player Two").getByText("Starts with 2 songs · 3 tokens")).toBeInTheDocument();
  });

  it("opens a player's row to adjust their starting songs", () => {
    const model = renderPlayers();
    const row = getRow("Player Two");
    const toggle = row.getByRole("button", { name: /^Player Two/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(row.getByRole("button", { name: "Starting songs: 4" }));

    expect(model.onPlayerStartingCardCountChange).toHaveBeenCalledWith(GUEST, 4);
  });

  it("removes a player only after the confirm", () => {
    const model = renderPlayers();
    const row = getRow("Player Two");
    fireEvent.click(row.getByRole("button", { name: /^Player Two/ }));
    const removeButton = row.getByRole("button", { name: "Remove Player Two from the room" });

    fireEvent.click(removeButton);
    const dialog = screen.getByRole("dialog", { name: "Remove Player Two from the room?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(model.onPlayerKick).not.toHaveBeenCalled();

    fireEvent.click(removeButton);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(model.onPlayerKick).toHaveBeenCalledWith(GUEST);
  });

  it("never offers the host a way to remove themselves", () => {
    renderPlayers();
    const row = getRow("Player One");
    fireEvent.click(row.getByRole("button", { name: /^Player One/ }));

    expect(row.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it("is a read-only list for guests", () => {
    renderPlayers({ currentPlayerId: TEST_GUEST_ID, isHost: false });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(getRow("Player Two").getByText("You · Starts with 1 song")).toBeInTheDocument();
  });
});
