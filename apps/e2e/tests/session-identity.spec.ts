import { expect, test, type Page } from "@playwright/test";
import {
  createNamedPage,
  escapeRegex,
  expectGamePage,
  expectLobbyPlayerCount,
  expectNoUnexpectedSpotifyRequests,
  hostRoom,
} from "./support/roomPages";

test.afterEach(async ({ request }) => {
  await expectNoUnexpectedSpotifyRequests(request);
});

function readSessionId(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("tunetrack.playerSessionId"));
}

async function joinFromDirectory(page: Page, roomId: string): Promise<void> {
  const directoryRoom = page.getByRole("button", { name: new RegExp(escapeRegex(roomId)) });
  await expect(directoryRoom).toBeVisible();
  await directoryRoom.click();
}

test("a closed room keeps the device session for the next room", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Session Guest");
  const host = await createNamedPage(browser, "Session Host");

  try {
    await guest.page.goto("/play");
    const firstRoomId = await hostRoom(host.page);
    await joinFromDirectory(guest.page, firstRoomId);
    await expectLobbyPlayerCount(host.page, 2);

    const hostSessionId = await readSessionId(host.page);
    const guestSessionId = await readSessionId(guest.page);
    expect(hostSessionId).toBeTruthy();
    expect(guestSessionId).toBeTruthy();

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, firstRoomId);
    await expectGamePage(guest.page, firstRoomId);
    const gameMenuButton = host.page.getByRole("button", { name: "Open game menu", exact: true });
    await expect(gameMenuButton).toHaveCount(1);
    await gameMenuButton.click();
    await host.page.getByRole("button", { name: "Close Room", exact: true }).click();
    await expect(host.page).toHaveURL("/");
    await expect(guest.page).toHaveURL("/");

    expect(await readSessionId(host.page)).toBe(hostSessionId);
    expect(await readSessionId(guest.page)).toBe(guestSessionId);

    await guest.page.goto("/play");
    const secondRoomId = await hostRoom(host.page);
    await joinFromDirectory(guest.page, secondRoomId);
    await expectLobbyPlayerCount(host.page, 2);
    await expectLobbyPlayerCount(guest.page, 2);

    expect(await readSessionId(host.page)).toBe(hostSessionId);
    expect(await readSessionId(guest.page)).toBe(guestSessionId);
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});
