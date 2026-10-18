import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerIntersection } from "../../../test/stubs/observers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { LobbyInviteCard } from "./LobbyInviteCard";

const HINT_TITLE = "Invite your friends";

function renderCard({
  isHost,
  isWaitingForPlayers,
}: {
  isHost: boolean;
  isWaitingForPlayers: boolean;
}) {
  renderWithProviders(
    <LobbyInviteCard
      isWaitingForPlayers={isWaitingForPlayers}
      onRename={isHost ? vi.fn() : undefined}
      roomCode="TEST_ROOM_1"
    />,
  );
  act(() => triggerIntersection(true));
  act(() => {
    vi.advanceTimersByTime(1_500);
  });
}

describe("LobbyInviteCard first-run hint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks the host to share the code while nobody has joined", () => {
    renderCard({ isHost: true, isWaitingForPlayers: true });

    expect(screen.getByRole("status", { name: HINT_TITLE })).toHaveTextContent(
      "Share the code so friends can join.",
    );
  });

  it.each([
    ["once a friend is in", { isHost: true, isWaitingForPlayers: false }],
    ["for a guest", { isHost: false, isWaitingForPlayers: true }],
  ])("stays quiet %s", (_, options) => {
    renderCard(options);

    expect(screen.queryByRole("status", { name: HINT_TITLE })).not.toBeInTheDocument();
  });
});
