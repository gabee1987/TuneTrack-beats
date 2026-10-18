import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { choosePracticeDeck, expectLobbyPlayerCount, hostRoom } from "./support/roomPages";

const SMALL_PHONE = { height: 667, width: 375 };

test.use({ viewport: SMALL_PHONE });

/** Inside the first screen: nothing of it needs a scroll to be seen. */
async function expectOnFirstScreen(page: Page, element: Locator) {
  const box = await element.boundingBox();
  expect(box, "the element is drawn").not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(SMALL_PHONE.height);
}

/** `22` §13: a small phone shows the whole lobby, for up to four players, without a scroll. */
test("a four-player lobby fits a 375 × 667 phone without scrolling", async ({
  openPlayer,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "the phone layout is the one that must fit");

  const host = await openPlayer("Layout Host");
  const roomId = await hostRoom(host.page);
  for (const name of ["Layout Guest One", "Layout Guest Two", "Layout Guest Three"]) {
    const guest = await openPlayer(name);
    await guest.page.goto(`/join/${roomId}`);
    await guest.page.getByRole("button", { name: "Join room" }).click();
    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
  }
  await expectLobbyPlayerCount(host.page, 4);
  await choosePracticeDeck(host.page);

  const lobby = host.page.getByRole("main");
  await expect.poll(() => host.page.evaluate(() => window.scrollY)).toBe(0);
  for (const element of [
    lobby.getByRole("heading", { name: "Get the room ready" }),
    lobby.getByRole("region", { name: "Room code" }),
    lobby.getByRole("region", { name: "Music" }),
    lobby.getByRole("button", { name: /^Rules\b/ }),
    lobby.getByRole("button", { name: "Start game" }),
  ]) {
    await expectOnFirstScreen(host.page, element);
  }
});
