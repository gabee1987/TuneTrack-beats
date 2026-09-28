import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const playerProfileStorageKey = "tunetrack.playerProfile.v1";

test("a guest joins a newly hosted room from the live directory", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Guest Player");
  const host = await createNamedPage(browser, "Host Player");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();

    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expectLobbyPlayers(host.page, "Host Player", "Guest Player");
    await expectLobbyPlayers(guest.page, "Guest Player", "Host Player");
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("the host starts the game for both players", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Game Guest");
  const host = await createNamedPage(browser, "Game Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();

    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a saved player profile joins from a direct invite in one action", async ({ browser }) => {
  const host = await createNamedPage(browser, "Invite Host");
  const guest = await createNamedPage(browser, "Invite Guest");

  try {
    const roomId = await hostRoom(host.page);
    await guest.page.goto(`/join/${roomId}`);

    await expect(guest.page.getByRole("heading", { name: roomId })).toBeVisible();
    const joinButton = guest.page.getByRole("button", { name: "Join room" });
    await expect(joinButton).toBeEnabled();
    await joinButton.click();

    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expect(guest.page).not.toHaveURL(/playerName=|intent=/);
    await expectLobbyPlayers(host.page, "Invite Host", "Invite Guest");
    await expectLobbyPlayers(guest.page, "Invite Guest", "Invite Host");
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

async function createNamedPage(
  browser: Browser,
  displayName: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
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

async function hostRoom(page: Page): Promise<string> {
  await page.goto("/play");
  await page.getByRole("button", { name: "Host a game" }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?#]+$/);

  const roomId = new URL(page.url()).pathname.split("/").at(-1);
  if (!roomId) {
    throw new Error("The hosted lobby URL did not contain a room code.");
  }
  return decodeURIComponent(roomId);
}

async function expectLobbyPlayers(
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

async function expectGamePage(page: Page, roomId: string): Promise<void> {
  await expect(page).toHaveURL(`/game/${roomId}`);
  await expect(page.getByRole("button", { name: /leaderboard/i }).first()).toBeVisible();
}

async function expectLobbyPlayerCount(page: Page, count: number): Promise<void> {
  const playerCountMetric = page.getByText("Players here", { exact: true }).locator("..");
  await expect(playerCountMetric.getByText(String(count), { exact: true }).first()).toBeVisible();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
