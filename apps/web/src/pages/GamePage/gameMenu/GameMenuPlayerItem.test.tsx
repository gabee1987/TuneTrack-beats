import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PublicPlayerState } from "@tunetrack/shared/client";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../../../features/i18n";
import {
  buildRoomSettings,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
} from "../../../test/roomStateFixtures";
import { GameMenuPlayerItem } from "./GameMenuPlayerItem";

vi.mock("framer-motion", async (importOriginal) => {
  const { withEagerMotion } = await import("../../../test/stubs/framerMotion");
  return withEagerMotion(await importOriginal<typeof import("framer-motion")>());
});

type ItemProps = ComponentProps<typeof GameMenuPlayerItem>;

interface RowOptions {
  /** The viewer; the row always shows the guest unless `rowPlayerId` says otherwise. */
  viewerId?: string;
  rowPlayerId?: string;
  guestOverrides?: Partial<PublicPlayerState>;
  ttModeEnabled?: boolean;
  overrides?: Partial<ItemProps>;
}

function buildRowProps({
  viewerId = TEST_HOST_ID,
  rowPlayerId = TEST_GUEST_ID,
  guestOverrides = {},
  ttModeEnabled = false,
  overrides = {},
}: RowOptions): Omit<ItemProps, "t"> {
  const baseState = buildTurnRoomState({ settings: buildRoomSettings({ ttModeEnabled }) });
  const roomState = {
    ...baseState,
    players: baseState.players.map((player) =>
      player.id === TEST_GUEST_ID ? { ...player, ...guestOverrides } : player,
    ),
  };
  return {
    awardTtActionState: null,
    cardCount: roomState.timelines[rowPlayerId]?.length ?? 0,
    isActiveTurnPlayer: rowPlayerId === roomState.turn?.activePlayerId,
    isAwardTtPending: false,
    isCurrentPlayer: rowPlayerId === viewerId,
    isViewerHost: roomState.hostId === viewerId,
    isKickPlayerPending: false,
    isTransferHostPending: false,
    kickPlayerActionState: null,
    onAwardTt: vi.fn(() => true),
    onKickPlayer: vi.fn(),
    onRemoveTt: vi.fn(() => true),
    onTransferHost: vi.fn(),
    player: roomState.players.find((player) => player.id === rowPlayerId)!,
    transferHostActionState: null,
    ttModeEnabled,
    ...overrides,
  };
}

function Row(props: Omit<ItemProps, "t">) {
  const { t } = useI18n();
  return (
    <ul>
      <GameMenuPlayerItem {...props} t={t} />
    </ul>
  );
}

function renderRow(options: RowOptions = {}) {
  const props = buildRowProps(options);
  const view = render(
    <I18nProvider>
      <Row {...props} />
    </I18nProvider>,
  );
  const rerenderRow = (nextOptions: RowOptions) =>
    view.rerender(
      <I18nProvider>
        <Row {...buildRowProps(nextOptions)} {...pickHandlers(props)} />
      </I18nProvider>,
    );
  return { ...view, props, rerenderRow };
}

function pickHandlers(props: Omit<ItemProps, "t">) {
  const { onAwardTt, onKickPlayer, onRemoveTt, onTransferHost } = props;
  return { onAwardTt, onKickPlayer, onRemoveTt, onTransferHost };
}

function openHostControls() {
  fireEvent.click(screen.getByRole("button", { name: /show host transfer controls/i }));
}

describe("GameMenuPlayerItem", () => {
  it("shows the player's name, cards and status badges", () => {
    renderRow({ guestOverrides: { connectionStatus: "disconnected" }, ttModeEnabled: true });

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Player Two")).toBeInTheDocument();
    expect(within(row).getByLabelText("1 cards")).toBeInTheDocument();
    expect(within(row).getByText("Offline")).toBeInTheDocument();
    expect(within(row).queryByText("Host")).not.toBeInTheDocument();
    expect(within(row).queryByText("Turn")).not.toBeInTheDocument();
  });

  it("calls the viewer 'You' and marks the host whose turn it is", () => {
    renderRow({ rowPlayerId: TEST_HOST_ID });

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("You")).toBeInTheDocument();
    expect(within(row).getByText("Host")).toBeInTheDocument();
    expect(within(row).getByText("Turn")).toBeInTheDocument();
  });

  it("gives a guest viewer no controls over another player", () => {
    renderRow({ viewerId: TEST_GUEST_ID, rowPlayerId: TEST_HOST_ID, ttModeEnabled: true });

    expect(screen.queryByRole("button", { name: /add token/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /host transfer controls/i })).toBeNull();
    expect(screen.getByRole("button", { expanded: false })).toBeDisabled();
  });

  it("lets the host adjust tokens only while TT mode is on", () => {
    const { props } = renderRow({ ttModeEnabled: true });

    fireEvent.click(screen.getByRole("button", { name: /add token/i }));

    expect(props.onAwardTt).toHaveBeenCalledWith(TEST_GUEST_ID);
  });

  it("transfers host after the host confirms", () => {
    const { props } = renderRow();

    openHostControls();
    fireEvent.click(screen.getByRole("button", { name: "Transfer host" }));
    const dialog = screen.getByRole("dialog", { name: "Transfer host controls" });
    expect(within(dialog).getByText(/Player Two will receive host controls/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Transfer host" }));

    expect(props.onTransferHost).toHaveBeenCalledWith(TEST_GUEST_ID);
  });

  it("cannot hand host controls to an offline player", () => {
    renderRow({ guestOverrides: { connectionStatus: "disconnected" } });

    openHostControls();

    expect(screen.getByRole("button", { name: "Transfer host" })).toBeDisabled();
  });

  it("removes a player after the host confirms, and cancelling sends nothing", async () => {
    const { props } = renderRow();

    openHostControls();
    fireEvent.click(screen.getByRole("button", { name: "Kick player" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Kick player" })).getByRole("button", {
        name: "Cancel",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(props.onKickPlayer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Kick player" }));
    const dialog = screen.getByRole("dialog", { name: "Kick player" });
    expect(within(dialog).getByRole("heading", { name: "Remove Player Two?" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove player" }));

    expect(props.onKickPlayer).toHaveBeenCalledWith(TEST_GUEST_ID);
  });

  it("names the retry on the row whose action failed", () => {
    renderRow({
      overrides: {
        kickPlayerActionState: { playerId: TEST_GUEST_ID, status: "failed" },
        transferHostActionState: { playerId: TEST_GUEST_ID, status: "failed" },
      },
    });

    openHostControls();

    expect(screen.getByRole("button", { name: "Try transferring again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Try removing again" })).toBeEnabled();
  });

  it("closes an open confirmation when the viewer stops being host", async () => {
    const { rerenderRow } = renderRow();
    openHostControls();
    fireEvent.click(screen.getByRole("button", { name: "Kick player" }));
    expect(screen.getByRole("dialog", { name: "Kick player" })).toBeInTheDocument();

    rerenderRow({ viewerId: TEST_GUEST_ID, rowPlayerId: TEST_GUEST_ID });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
