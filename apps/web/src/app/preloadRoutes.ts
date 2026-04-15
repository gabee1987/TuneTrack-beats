import { preloadSocketClient } from "../services/socket/socketClient";

let lobbyPagePromise: Promise<unknown> | null = null;
let gamePagePromise: Promise<unknown> | null = null;

export function preloadLobbyPage(): void {
  if (!lobbyPagePromise) {
    lobbyPagePromise = import("../pages/LobbyPage/LobbyPage");
  }
}

export function preloadGamePage(): void {
  if (!gamePagePromise) {
    gamePagePromise = import("../pages/GamePage/GamePage");
  }
}

export function preloadLobbyRuntime(): void {
  preloadLobbyPage();
  preloadSocketClient();
}

export function preloadGameRuntime(): void {
  preloadGamePage();
  preloadSocketClient();
}
