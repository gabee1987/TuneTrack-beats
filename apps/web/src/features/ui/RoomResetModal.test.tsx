import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../test/renderOnHistoryRoute";
import { readOverlayHistoryIds } from "../overlay/overlayHistory";
import { renderWithProviders } from "../../test/renderWithProviders";
import { RoomResetModal } from "./RoomResetModal";

describe("RoomResetModal", () => {
  beforeAll(installRouterRequestStub);

  it("stays open on Escape and scrim taps; only its action leaves", async () => {
    const onReset = vi.fn();
    renderWithProviders(<RoomResetModal isOpen onReset={onReset} reason="closed" />);
    const dialog = await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");
    fireEvent.click(dialog.parentElement as Element);

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
  });

  it("resets on Back without leaving the page first (owner decision 2026-10-08)", async () => {
    const onReset = vi.fn();
    const router = renderOnHistoryRoute(
      <RoomResetModal isOpen onReset={onReset} reason="closed" />,
    );
    await screen.findByRole("dialog");

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("pops its history entry before the action resets", async () => {
    const entriesAtReset: string[][] = [];
    const router = renderOnHistoryRoute(
      <RoomResetModal
        isOpen
        onReset={() => entriesAtReset.push(readOverlayHistoryIds(router.state.location.state))}
        reason="closed"
      />,
    );

    await userEvent.click(await screen.findByRole("button"));

    await waitFor(() => expect(entriesAtReset).toEqual([[]]));
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("sits on the blocking layer", async () => {
    renderWithProviders(<RoomResetModal isOpen onReset={vi.fn()} reason="server_restarted" />);
    const dialog = await screen.findByRole("dialog");

    expect((dialog.parentElement as HTMLElement).style.zIndex).toBe("var(--z-blocking)");
  });
});
