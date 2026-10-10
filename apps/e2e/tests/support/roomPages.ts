import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

const playerProfileStorageKey = "tunetrack.playerProfile.v1";

export interface PlayerPage {
  context: BrowserContext;
  page: Page;
}

export async function expectNoUnexpectedSpotifyRequests(request: APIRequestContext): Promise<void> {
  const response = await request.get("http://127.0.0.1:3102/requests");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toEqual({ unexpectedRequests: [] });
}

export async function createNamedPage(browser: Browser, displayName: string): Promise<PlayerPage> {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    class FakeSpotifyPlayer {
      private readonly listeners = new Map<string, (payload: unknown) => void>();

      public activateElement(): Promise<void> {
        return Promise.resolve();
      }

      public addListener(eventName: string, listener: (payload: unknown) => void): boolean {
        this.listeners.set(eventName, listener);
        return true;
      }

      public connect(): Promise<boolean> {
        queueMicrotask(() => this.listeners.get("ready")?.({ device_id: "E2E_DEVICE" }));
        return Promise.resolve(true);
      }

      public disconnect(): void {}

      public getCurrentState(): Promise<null> {
        return Promise.resolve(null);
      }

      public pause(): Promise<void> {
        return Promise.resolve();
      }

      public resume(): Promise<void> {
        return Promise.resolve();
      }

      public seek(): Promise<void> {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "Spotify", {
      configurable: true,
      value: { Player: FakeSpotifyPlayer },
    });
  });
  await context.addInitScript(
    ({ name, storageKey }) => {
      if (window.location.protocol === "about:") {
        return;
      }

      localStorage.setItem("tunetrack.language", "en");
      localStorage.setItem(
        storageKey,
        JSON.stringify({ displayName: name, hasCompletedSetup: true }),
      );
    },
    { name: displayName, storageKey: playerProfileStorageKey },
  );

  return { context, page: await context.newPage() };
}

export async function hostRoom(page: Page): Promise<string> {
  await page.goto("/play");
  await page.getByRole("button", { name: "Host a game" }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?#]+$/);

  const roomId = new URL(page.url()).pathname.split("/").at(-1);
  if (!roomId) {
    throw new Error("The hosted lobby URL did not contain a room code.");
  }
  return decodeURIComponent(roomId);
}

export async function joinFromDirectory(page: Page, roomId: string): Promise<void> {
  const directoryRoom = page.getByRole("button", { name: new RegExp(escapeRegex(roomId)) });
  await expect(directoryRoom).toBeVisible();
  await directoryRoom.click();
}

export async function startGame(host: Page, roomId: string, ...guests: Page[]): Promise<void> {
  await host.getByRole("button", { name: "Start Game" }).first().click();
  for (const page of [host, ...guests]) {
    await expectGamePage(page, roomId);
  }
}

/**
 * Both layouts render the same roster, which names the viewer "You"; each player's own name is
 * therefore proven on the other player's page.
 */
export async function expectLobbyRoster(page: Page, otherDisplayName: string): Promise<void> {
  const roster = page.getByRole("listitem");
  await expect(roster).toHaveCount(2);
  await expect(roster.filter({ hasText: "You" })).toHaveCount(1);
  await expect(roster.filter({ hasText: otherDisplayName })).toHaveCount(1);
}

export async function expectGamePage(page: Page, roomId: string): Promise<void> {
  await expect(page).toHaveURL(`/game/${roomId}`);
  await expect(page.getByRole("button", { name: /leaderboard/i }).first()).toBeVisible();
}

/**
 * The lobby keeps its own menu button until its exit animation ends; the game page is the main
 * landmark that holds the leaderboard button.
 */
export async function openGameMenu(page: Page): Promise<void> {
  const gamePage = page
    .getByRole("main")
    .filter({ has: page.getByRole("button", { name: /leaderboard/i }) });
  await gamePage.getByRole("button", { name: "Open game menu", exact: true }).click();
}

/**
 * Both layouts render the turn status in the game header; the phone layout shows the visible
 * timeline's owner in its place, so the status is checked in the document, not on screen.
 */
export async function expectHeaderStatus(page: Page, statusText: string): Promise<void> {
  await expect(page.getByText(statusText, { exact: true }).first()).toBeAttached();
}

/** Home names its primary action "Start" on desktop and "Lets go!" on a phone. */
export function homeStartButton(page: Page): Locator {
  return page.getByRole("button", { name: /^(Start|Lets go!)$/ });
}

export async function expectLobbyPlayerCount(page: Page, count: number): Promise<void> {
  await expect(page.getByRole("listitem")).toHaveCount(count);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
