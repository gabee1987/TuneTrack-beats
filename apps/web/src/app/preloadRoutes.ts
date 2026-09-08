import { preloadAppShellMenu } from "../features/app-shell/loadAppShellMenuDialog";
import { preloadSocketClient } from "../services/socket/socketClient";

let lobbyPagePromise: Promise<unknown> | null = null;
let gamePagePromise: Promise<unknown> | null = null;

/**
 * A rejected preload must not be remembered. Keeping the failed promise would make every
 * later attempt — including the router's own `lazy()` import for that route — reuse the
 * rejection, so one transient chunk failure would break the route for the rest of the
 * session.
 */
function warnPreloadFailed(error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn("[preloadRoutes] a route chunk failed to preload", error);
  }
}

export function preloadLobbyPage(): void {
  if (lobbyPagePromise) {
    return;
  }

  lobbyPagePromise = import("../pages/LobbyPage/LobbyPage").catch((error: unknown) => {
    lobbyPagePromise = null;
    warnPreloadFailed(error);
  });
}

export function preloadGamePage(): void {
  if (gamePagePromise) {
    return;
  }

  gamePagePromise = import("../pages/GamePage/GamePage").catch((error: unknown) => {
    gamePagePromise = null;
    warnPreloadFailed(error);
  });
}

export function preloadLobbyRuntime(): void {
  preloadLobbyPage();
  preloadSocketClient();
  preloadAppShellMenu();
}

export function preloadGameRuntime(): void {
  preloadGamePage();
  preloadSocketClient();
  preloadAppShellMenu();
}
