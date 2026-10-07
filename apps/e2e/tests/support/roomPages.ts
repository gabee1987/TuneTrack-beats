import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const playerProfileStorageKey = "tunetrack.playerProfile.v1";

export async function expectNoUnexpectedSpotifyRequests(request: APIRequestContext): Promise<void> {
  const response = await request.get("http://127.0.0.1:3102/requests");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toEqual({ unexpectedRequests: [] });
}

export async function createNamedPage(
  browser: Browser,
  displayName: string,
): Promise<{ context: BrowserContext; page: Page }> {
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

export async function expectLobbyPlayers(
  page: Page,
  ownDisplayName: string,
  otherDisplayName: string,
): Promise<void> {
  await expect(page.getByText(ownDisplayName, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("listitem").filter({ hasText: otherDisplayName }).first(),
  ).toBeVisible();
}

export async function expectGamePage(page: Page, roomId: string): Promise<void> {
  await expect(page).toHaveURL(`/game/${roomId}`);
  await expect(page.getByRole("button", { name: /leaderboard/i }).first()).toBeVisible();
}

export async function expectLobbyPlayerCount(page: Page, count: number): Promise<void> {
  const playerCountMetric = page.getByText("Players here", { exact: true }).locator("..");
  await expect(playerCountMetric.getByText(String(count), { exact: true }).first()).toBeVisible();
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
