import { act, renderHook } from "@testing-library/react";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared/client";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { I18nProvider } from "../../../../features/i18n";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../../test/fakeSocket";
import { TEST_ROOM_ID } from "../../../../test/roomStateFixtures";
import { useSpotifyAuth } from "./useSpotifyAuth";

vi.mock("../../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const TEST_AUTH_URL = "https://accounts.example.test/authorize?client_id=TEST_CLIENT_1";
const AUTH_POPUP_POLL_MS = 400;
const POPUP_CLOSE_GRACE_MS = 750;
const AUTH_TIMEOUT_MS = 120_000;

const AUTH_CANCELLED = "Spotify login was cancelled. You can try again when ready.";
const POPUP_BLOCKED = "Popup was blocked. Please allow popups for this page and try again.";
const UNKNOWN_SPOTIFY_ERROR = "Spotify login failed. Please try again.";

interface FakePopup {
  closed: boolean;
  close: ReturnType<typeof vi.fn>;
  location: { href: string };
}

function createFakePopup(): FakePopup {
  const popup: FakePopup = {
    closed: false,
    close: vi.fn(() => {
      popup.closed = true;
    }),
    location: { href: "about:blank" },
  };
  return popup;
}

function I18nTestWrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

function renderAuth({ roomId }: { roomId: string | undefined } = { roomId: TEST_ROOM_ID }) {
  return renderHook(() => useSpotifyAuth(roomId), { wrapper: I18nTestWrapper });
}

async function flushMicrotasks() {
  await act(async () => {});
}

let openSpy: MockInstance<typeof window.open>;
let popup: FakePopup;

beforeEach(() => {
  vi.useFakeTimers();
  resetSharedFakeSocket();
  popup = createFakePopup();
  openSpy = vi.spyOn(window, "open").mockImplementation(() => popup as unknown as Window);
});

afterEach(() => {
  openSpy.mockRestore();
  vi.useRealTimers();
});

async function connect(result: { current: ReturnType<typeof useSpotifyAuth> }) {
  act(() => {
    result.current.connectSpotify();
  });
  await flushMicrotasks();
}

describe("useSpotifyAuth", () => {
  it("starts idle without an account type or error", () => {
    const { result } = renderAuth();

    expect(result.current.authPhase).toBe("idle");
    expect(result.current.authError).toBeNull();
    expect(result.current.accountType).toBeNull();
  });

  it("does nothing when there is no room yet", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth({ roomId: undefined });

    await connect(result);

    expect(openSpy).not.toHaveBeenCalled();
    expect(result.current.authPhase).toBe("idle");
    expect(socket.emittedFor(ClientToServerEvent.RequestSpotifyAuthUrl)).toEqual([]);
  });

  it("opens a popup, listens for the auth URL and requests it for the room", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();

    await connect(result);

    expect(result.current.authPhase).toBe("connecting");
    expect(openSpy).toHaveBeenCalledWith("about:blank", "spotify-auth", expect.any(String));
    expect(socket.emittedFor(ClientToServerEvent.RequestSpotifyAuthUrl)).toEqual([
      { roomId: TEST_ROOM_ID, clientOrigin: window.location.origin },
    ]);
    expect(socket.listenerCount(ServerToClientEvent.SpotifyAuthUrl)).toBe(1);
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(1);
  });

  it("navigates the open popup to the auth URL the server sends", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      socket.serverEmit(ServerToClientEvent.SpotifyAuthUrl, { authUrl: TEST_AUTH_URL });
    });

    expect(popup.location.href).toBe(TEST_AUTH_URL);
    expect(socket.listenerCount(ServerToClientEvent.SpotifyAuthUrl)).toBe(0);
  });

  it("does not navigate a popup that is already closed", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);
    popup.closed = true;

    act(() => {
      socket.serverEmit(ServerToClientEvent.SpotifyAuthUrl, { authUrl: TEST_AUTH_URL });
    });

    expect(popup.location.href).toBe("about:blank");
  });

  it("reports a blocked popup without contacting the server", async () => {
    const socket = getSharedFakeSocket();
    openSpy.mockReturnValue(null);
    const { result } = renderAuth();

    await connect(result);

    expect(result.current.authPhase).toBe("error");
    expect(result.current.authError).toBe(POPUP_BLOCKED);
    expect(socket.emittedFor(ClientToServerEvent.RequestSpotifyAuthUrl)).toEqual([]);
  });

  it("stores the account type and closes the popup on a successful auth result", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      result.current.handleAuthResult({
        success: true,
        accessToken: "TEST_ACCESS_TOKEN",
        accountType: "premium",
        expiresInSeconds: 3600,
      });
    });
    await flushMicrotasks();

    expect(result.current.authPhase).toBe("idle");
    expect(result.current.authError).toBeNull();
    expect(result.current.accountType).toBe("premium");
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the localized error for a failed auth result", async () => {
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      result.current.handleAuthResult({
        success: false,
        code: "exchange_failed",
        message: "TEST_SERVER_MESSAGE",
      });
    });

    expect(result.current.authPhase).toBe("error");
    expect(result.current.authError).toBe("Could not complete Spotify login. Please try again.");
    expect(result.current.accountType).toBeNull();
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it.each(["REQUEST_SPOTIFY_AUTH_URL_FAILED", "INVALID_REQUEST_SPOTIFY_AUTH_URL_PAYLOAD"])(
    "fails with the server message on a %s error",
    async (code) => {
      const socket = getSharedFakeSocket();
      const { result } = renderAuth();
      await connect(result);

      act(() => {
        socket.serverEmit(ServerToClientEvent.Error, { code, message: "TEST_SERVER_MESSAGE" });
      });
      await flushMicrotasks();

      expect(result.current.authPhase).toBe("error");
      expect(result.current.authError).toBe("TEST_SERVER_MESSAGE");
      expect(popup.close).toHaveBeenCalledTimes(1);
      expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(0);
    },
  );

  it("falls back to the generic Spotify error when the server error has no message", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      socket.serverEmit(ServerToClientEvent.Error, {
        code: "REQUEST_SPOTIFY_AUTH_URL_FAILED",
        message: "",
      });
    });

    expect(result.current.authError).toBe(UNKNOWN_SPOTIFY_ERROR);
  });

  it("ignores unrelated server errors while connecting", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      socket.serverEmit(ServerToClientEvent.Error, {
        code: "ROOM_NOT_FOUND",
        message: "TEST_SERVER_MESSAGE",
      });
    });

    expect(result.current.authPhase).toBe("connecting");
    expect(result.current.authError).toBeNull();
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("keeps waiting while the popup stays open", async () => {
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      vi.advanceTimersByTime(AUTH_POPUP_POLL_MS * 5);
    });

    expect(result.current.authPhase).toBe("connecting");
  });

  it("treats a popup the user closed as cancelled after a short grace", async () => {
    const { result } = renderAuth();
    await connect(result);
    popup.closed = true;

    act(() => {
      vi.advanceTimersByTime(AUTH_POPUP_POLL_MS);
    });
    expect(result.current.authPhase).toBe("connecting");

    act(() => {
      vi.advanceTimersByTime(POPUP_CLOSE_GRACE_MS);
    });

    expect(result.current.authPhase).toBe("error");
    expect(result.current.authError).toBe(AUTH_CANCELLED);
  });

  it("lets a successful callback win over the popup closing itself", async () => {
    const { result } = renderAuth();
    await connect(result);
    popup.closed = true;

    act(() => {
      vi.advanceTimersByTime(AUTH_POPUP_POLL_MS);
    });
    act(() => {
      result.current.handleAuthResult({
        success: true,
        accessToken: "TEST_ACCESS_TOKEN",
        accountType: "free",
        expiresInSeconds: 3600,
      });
    });
    act(() => {
      vi.advanceTimersByTime(POPUP_CLOSE_GRACE_MS);
    });

    expect(result.current.authPhase).toBe("idle");
    expect(result.current.authError).toBeNull();
    expect(result.current.accountType).toBe("free");
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("times out and closes the popup when no result arrives", async () => {
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      vi.advanceTimersByTime(AUTH_TIMEOUT_MS);
    });

    expect(result.current.authPhase).toBe("error");
    expect(result.current.authError).toMatch(/^Spotify login timed out\./);
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it("cancels on request and ignores server events for the abandoned attempt", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      result.current.cancelConnectSpotify();
      socket.serverEmit(ServerToClientEvent.Error, {
        code: "REQUEST_SPOTIFY_AUTH_URL_FAILED",
        message: "TEST_SERVER_MESSAGE",
      });
      socket.serverEmit(ServerToClientEvent.SpotifyAuthUrl, { authUrl: TEST_AUTH_URL });
    });
    await flushMicrotasks();

    expect(result.current.authPhase).toBe("error");
    expect(result.current.authError).toBe(AUTH_CANCELLED);
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(popup.location.href).toBe("about:blank");
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets an error back to idle", async () => {
    openSpy.mockReturnValue(null);
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      result.current.resetAuth();
    });

    expect(result.current.authPhase).toBe("idle");
    expect(result.current.authError).toBeNull();
  });

  it("does not request an auth URL when the attempt is reset before the socket resolves", async () => {
    const socket = getSharedFakeSocket();
    const { result } = renderAuth();

    act(() => {
      result.current.connectSpotify();
      result.current.resetAuth();
    });
    await flushMicrotasks();

    expect(socket.emittedFor(ClientToServerEvent.RequestSpotifyAuthUrl)).toEqual([]);
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(0);
    expect(result.current.authPhase).toBe("idle");
  });

  it("replaces a previous attempt when connecting again", async () => {
    const socket = getSharedFakeSocket();
    const firstPopup = popup;
    const { result } = renderAuth();
    await connect(result);

    const secondPopup = createFakePopup();
    openSpy.mockImplementation(() => secondPopup as unknown as Window);
    await connect(result);

    expect(firstPopup.close).toHaveBeenCalledTimes(1);
    expect(socket.emittedFor(ClientToServerEvent.RequestSpotifyAuthUrl)).toHaveLength(2);
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(1);
    expect(result.current.authPhase).toBe("connecting");
  });

  it("closes the popup directly through closeAuthPopup", async () => {
    const { result } = renderAuth();
    await connect(result);

    act(() => {
      result.current.closeAuthPopup();
      result.current.closeAuthPopup();
    });

    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it("closes the popup, clears timers and removes listeners on unmount", async () => {
    const socket = getSharedFakeSocket();
    const { result, unmount } = renderAuth();
    await connect(result);

    unmount();
    await flushMicrotasks();

    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(socket.listenerCount(ServerToClientEvent.Error)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
