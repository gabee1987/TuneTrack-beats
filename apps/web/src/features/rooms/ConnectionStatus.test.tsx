import { act, screen } from "@testing-library/react";
import { ServerToClientEvent } from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { trackSocketConnection } from "../../services/socket/connectionState";
import { createFakeSocket, type FakeSocket } from "../../test/fakeSocket";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ConnectionBanner } from "./ConnectionBanner";
import { ConnectionStatus } from "./ConnectionStatus";

let untrack: (() => void) | null = null;

function trackConnectedSocket(): FakeSocket {
  const socket = createFakeSocket({ connected: true });
  untrack = trackSocketConnection(socket as unknown as Socket);
  return socket;
}

describe.each([
  { name: "ConnectionStatus", Indicator: ConnectionStatus },
  { name: "ConnectionBanner", Indicator: ConnectionBanner },
])("$name", ({ Indicator }) => {
  afterEach(() => {
    untrack?.();
    untrack = null;
  });

  it("stays empty while connected and names the problem once the socket drops", () => {
    const socket = trackConnectedSocket();
    renderWithProviders(<Indicator />, { withRouter: false });
    expect(screen.getByRole("status")).toHaveTextContent("");

    act(() => socket.simulateDisconnect());

    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });

  it("says the server is restarting after the shutdown notice", () => {
    const socket = trackConnectedSocket();
    renderWithProviders(<Indicator />, { withRouter: false });

    act(() => {
      socket.serverEmit(ServerToClientEvent.ServerShuttingDown);
      socket.simulateDisconnect();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Server is restarting…");
  });
});
