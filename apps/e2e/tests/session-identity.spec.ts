import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import {
  expectLobbyPlayerCount,
  hostRoom,
  joinFromDirectory,
  openGameMenu,
  startGame,
} from "./support/roomPages";

function readSessionId(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("tunetrack.playerSessionId"));
}

test("a closed room keeps the device session for the next room", async ({ openRoom }) => {
  const {
    guest,
    host,
    roomId: firstRoomId,
  } = await openRoom({
    guest: "Session Guest",
    host: "Session Host",
  });

  const hostSessionId = await readSessionId(host.page);
  const guestSessionId = await readSessionId(guest.page);
  expect(hostSessionId).toBeTruthy();
  expect(guestSessionId).toBeTruthy();

  await startGame(host.page, firstRoomId, guest.page);
  await openGameMenu(host.page);
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
});
