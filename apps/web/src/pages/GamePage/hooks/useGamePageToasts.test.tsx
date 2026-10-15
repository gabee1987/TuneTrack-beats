import type { PublicRoomState } from "@tunetrack/shared/client";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import {
  buildRoomSettings,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
} from "../../../test/roomStateFixtures";
import { HANDOVER_TOAST_DURATION_MS } from "../gamePageToast.types";
import { useGamePageToasts } from "./useGamePageToasts";

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function renderToasts(roomState: PublicRoomState | null, currentPlayerId: string) {
  return renderHook(
    (props: { roomState: PublicRoomState | null }) =>
      useGamePageToasts({
        currentPlayerId,
        errorKey: 0,
        errorMessage: null,
        roomState: props.roomState,
      }),
    { initialProps: { roomState }, wrapper },
  );
}

const spotifyGame = buildTurnRoomState({
  settings: buildRoomSettings({
    deckSource: "spotify",
    spotifyAuthStatus: "connected",
    spotifyPlaybackOwnerPlayerId: TEST_HOST_ID,
  }),
});

describe("useGamePageToasts handover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("greets a guest once on the first turn and clears it after four seconds", () => {
    const { result, rerender } = renderToasts(null, TEST_GUEST_ID);
    rerender({ roomState: spotifyGame });

    expect(result.current.map((toast) => toast.message)).toEqual([
      "Game on! Music plays on Player One's phone.",
    ]);

    act(() => {
      vi.advanceTimersByTime(HANDOVER_TOAST_DURATION_MS - 1);
    });
    expect(result.current).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toHaveLength(0);

    rerender({ roomState: { ...spotifyGame } });
    expect(result.current).toHaveLength(0);
  });

  it("does not greet the host", () => {
    const { result } = renderToasts(spotifyGame, TEST_HOST_ID);

    expect(result.current).toHaveLength(0);
  });
});
