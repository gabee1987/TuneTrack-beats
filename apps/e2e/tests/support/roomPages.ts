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

/** A fresh device; `null` means no saved name, as on a first visit. */
export async function createNamedPage(
  browser: Browser,
  displayName: string | null,
): Promise<PlayerPage> {
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
      if (name !== null) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ displayName: name, hasCompletedSetup: true }),
        );
      }
    },
    { name: displayName, storageKey: playerProfileStorageKey },
  );

  return { context, page: await context.newPage() };
}

export async function hostRoom(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Host a game", exact: true }).click();
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
  // Join's open-rooms list is a list too, so a player count only means something in the lobby.
  await expect(page).toHaveURL(`/lobby/${roomId}`);
}

/** Start needs a deck (decision 7); the practice deck is the explicit choice that needs no Spotify. */
export async function choosePracticeDeck(host: Page): Promise<void> {
  const practiceDeckButton = host.getByRole("button", {
    name: "Use the practice deck",
    exact: true,
  });
  // Right after create the leaving lobby is still drawn but hidden from the accessibility tree.
  await expect(practiceDeckButton).toHaveCount(1);
  await practiceDeckButton.click();
  await expect(host.getByText(/^Practice deck · \d+ songs · no audio$/)).toBeVisible();
}

/** Both layouts edit the rules in the Rules sheet behind the Rules card; Done closes it. */
export async function editRules(host: Page, edit: () => Promise<void>): Promise<void> {
  await openRulesSheet(host);
  await edit();
  await host.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: "Done" }).click();
  await expect(host.getByRole("dialog", { name: "Rules" })).toHaveCount(0);
}

/**
 * Opens the Rules sheet and waits until it has slid fully in, flush with the right edge (the
 * whole screen on phones, a side sheet on desktop): a tap during the slide lands on whatever has
 * moved under the pointer by then.
 */
export async function openRulesSheet(host: Page): Promise<Locator> {
  await host.getByRole("button", { name: /^Rules/ }).click();
  const sheet = host.getByRole("dialog", { name: "Rules" });
  const viewportWidth = host.viewportSize()?.width ?? 0;
  await expect
    .poll(async () => {
      const box = await sheet.boundingBox();
      return box ? Math.round(box.x + box.width) : -1;
    })
    .toBe(viewportWidth);
  return sheet;
}

/**
 * Phones list the players in the Rules sheet; the desktop lobby lists them beside the cards.
 * Returns where the player rows are, with the sheet open on phones.
 */
export async function openPlayerList(host: Page, isMobile: boolean): Promise<Locator> {
  if (isMobile) return openRulesSheet(host);
  return host.getByRole("main").getByRole("complementary");
}

/**
 * Sets a number rule the way each layout offers it: the ruler's − and + buttons on phones (a tick
 * off screen is out of a thumb's reach too), typing into the stepper on desktop.
 */
export async function setRuleNumber(scope: Page | Locator, label: string, value: number) {
  // Closed player rows keep their own "Starting tokens" control mounted, out of sight.
  const ruler = scope.getByRole("slider", { name: label, exact: true }).filter({ visible: true });
  const stepper = scope
    .getByRole("spinbutton", { name: label, exact: true })
    .filter({ visible: true });
  await expect(ruler.or(stepper)).toBeVisible();
  if ((await ruler.count()) > 0) {
    const current = Number(await ruler.getAttribute("aria-valuenow"));
    const direction = value < current ? "Decrease" : "Increase";
    const step = scope
      .getByRole("button", { name: `${direction} ${label}`, exact: true })
      .filter({ visible: true });
    for (let count = Math.abs(value - current); count > 0; count -= 1) await step.click();
    await expect(ruler).toHaveAttribute("aria-valuenow", String(value));
    return;
  }
  await stepper.fill(String(value));
  await stepper.press("Enter");
  await expect(stepper).toHaveValue(String(value));
}

/**
 * Tokens are on in a new room, so every placement first opens a Beat! window; a scenario about
 * placement, reveal or recovery turns them off to reveal at once.
 */
export async function turnTokensOff(host: Page): Promise<void> {
  await editRules(host, async () => {
    const tokens = host.getByRole("switch", { name: "Tokens" });
    await tokens.click();
    await expect(tokens).toHaveAttribute("aria-checked", "false");
  });
}

export async function startGame(host: Page, roomId: string, ...guests: Page[]): Promise<void> {
  await choosePracticeDeck(host);
  await host.getByRole("button", { name: "Start game" }).click();
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

/** Home offers "Join a game" on both desktop and phone. */
export function homeJoinButton(page: Page): Locator {
  return page.getByRole("button", { name: "Join a game", exact: true });
}

export async function expectLobbyPlayerCount(page: Page, count: number): Promise<void> {
  await expect(page.getByRole("listitem")).toHaveCount(count);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
