import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberRoomEventToast } from "../../services/session/roomEventToast";
import { renderWithProviders } from "../../test/renderWithProviders";
import { HomePage } from "./HomePage";

const { preloadLobbyRuntimeMock } = vi.hoisted(() => ({ preloadLobbyRuntimeMock: vi.fn() }));

vi.mock("../../app/preloadRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../app/preloadRoutes")>()),
  preloadLobbyRuntime: preloadLobbyRuntimeMock,
}));

const KICKED_MESSAGE = "You were removed from TEST_ROOM_1.";

function renderHome(layout: "mobile" | "desktop" = "mobile") {
  return renderWithProviders(
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<p>Room selection</p>} path="/play" />
    </Routes>,
    { layout },
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("HomePage on a phone", () => {
  it("introduces the game in three steps", async () => {
    renderHome();

    expect(await screen.findByRole("img", { name: "TuneTrack Beats" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(["Guess", "Place", "Challenge"]);
  });

  it("warms the lobby on intent and continues to room selection", async () => {
    renderHome();
    const start = await screen.findByRole("button", { name: "Lets go!" });

    fireEvent.focus(start);
    expect(preloadLobbyRuntimeMock).toHaveBeenCalled();

    await userEvent.click(start);
    expect(screen.getByText("Room selection")).toBeInTheDocument();
  });
});

describe("HomePage on a desktop", () => {
  it("shows the hero and continues to room selection", async () => {
    renderHome("desktop");

    expect(await screen.findByRole("heading", { name: "TuneTrack beats" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByText("Room selection")).toBeInTheDocument();
  });
});

describe("HomePage after the player was removed from a room", () => {
  it("tells them once when they arrive", async () => {
    rememberRoomEventToast({ reason: "kicked", roomName: "TEST_ROOM_1" });

    renderHome();

    expect(await screen.findByText(KICKED_MESSAGE)).toBeInTheDocument();
  });

  it("tells them while Home is open, then clears the message", async () => {
    renderHome();
    await screen.findByRole("button", { name: "Lets go!" });
    vi.useFakeTimers();

    act(() => {
      rememberRoomEventToast({ reason: "kicked", roomName: "TEST_ROOM_1" });
    });
    expect(screen.getByText(KICKED_MESSAGE)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4_500);
    });
    expect(screen.queryByText(KICKED_MESSAGE)).not.toBeInTheDocument();
  });
});
