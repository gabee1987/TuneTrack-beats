import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { buildTimelineCard } from "../../../test/roomStateFixtures";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../../test/renderOnHistoryRoute";
import type { GamePageCard } from "../GamePage.types";
import { SongInfoModal } from "./SongInfoModal";

function SongInfoScreen() {
  const [card, setCard] = useState<GamePageCard | null>(null);

  return (
    <>
      <button onClick={() => setCard(buildTimelineCard())} type="button">
        Show song info
      </button>
      <SongInfoModal card={card} onClose={() => setCard(null)} />
    </>
  );
}

describe("SongInfoModal", () => {
  beforeAll(installRouterRequestStub);

  it("closes on Back without leaving the game page (plan 14 §4.3)", async () => {
    const router = renderOnHistoryRoute(<SongInfoScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Show song info" }));
    expect(await screen.findByRole("dialog", { name: "Placed Track" })).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Placed Track" })).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("closes from its close button and gives the history entry back", async () => {
    const router = renderOnHistoryRoute(<SongInfoScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Show song info" }));
    await userEvent.click(await screen.findByRole("button", { name: "Close song info" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Placed Track" })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(router.state.historyAction).toBe("POP");
    });
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });
});
