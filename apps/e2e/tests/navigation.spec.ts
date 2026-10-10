import { expect, test } from "./support/fixtures";
import {
  expectGamePage,
  homeStartButton,
  hostRoom,
  openGameMenu,
  startGame,
} from "./support/roomPages";

test("the host closes the room and both players can start again immediately", async ({
  openRoom,
}) => {
  const { guest, host, roomId } = await openRoom({ guest: "Close Guest", host: "Close Host" });
  await startGame(host.page, roomId, guest.page);

  await openGameMenu(host.page);
  await host.page.getByRole("button", { name: "Close Room", exact: true }).click();

  for (const page of [host.page, guest.page]) {
    await expect(page).toHaveURL("/");
    const startButton = homeStartButton(page);
    await expect(startButton).toBeVisible();
    await startButton.click();
    await expect(page).toHaveURL("/play");
  }
});

test("the lobby leaves the page once the game starts", async ({ openPlayer }) => {
  // B18: a lobby that mounted motion while exiting stayed behind the game page for good; it
  // showed under load (`PageTransition.test.tsx` holds the deterministic proof).
  const host = await openPlayer("Exit Host");
  const roomId = await hostRoom(host.page);

  await startGame(host.page, roomId);

  await expect(host.page.getByRole("main")).toHaveCount(1);
});

test("browser back closes game settings without leaving the game", async ({ openPlayer }) => {
  const host = await openPlayer("Settings Host");
  const roomId = await hostRoom(host.page);
  await startGame(host.page, roomId);

  await openGameMenu(host.page);
  await expect(host.page.getByRole("button", { name: "Close menu", exact: true })).toBeVisible();

  await host.page.evaluate(() => window.history.back());

  await expect(host.page.getByRole("button", { name: "Close menu", exact: true })).toHaveCount(0);
  await expectGamePage(host.page, roomId);
});

test("nested playlist editors close one level at a time without leaving the lobby", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Playlist Host");
  const roomId = await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Open music setup", exact: true }).first().click();

  const popupPromise = host.page.waitForEvent("popup");
  await host.page
    .getByRole("button", { name: "Connect with Spotify", exact: true })
    .first()
    .click();
  const popup = await popupPromise;
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(host.page.getByText("Connected", { exact: true }).first()).toBeVisible();

  await host.page
    .getByPlaceholder("Paste playlist link or search playlist name")
    .first()
    .fill("spotify:playlist:TESTPLAYLIST1234567890");
  await host.page.getByRole("button", { name: "Import", exact: true }).first().click();
  await expect(host.page.getByText("10 tracks queued up", { exact: true }).first()).toBeVisible();
  await host.page.getByRole("button", { name: "Edit playlist", exact: true }).first().click();

  await expect(host.page.getByRole("dialog", { name: "Edit playlist" })).toBeVisible();
  const firstTrack = host.page.getByRole("button", { name: /^E2E Track 1/ }).first();
  await firstTrack.click();

  const releaseYearField = host.page.getByRole("spinbutton", {
    name: "Album Release Year",
    exact: true,
  });
  await releaseYearField.fill("1977");
  await host.page.getByRole("button", { name: "Save track", exact: true }).click();
  await expect(releaseYearField).toHaveCount(0);

  await firstTrack.click();
  await expect(releaseYearField).toHaveValue("1977");

  await host.page.goBack();
  await expect(releaseYearField).toHaveCount(0);
  await expect(host.page.getByRole("dialog", { name: "Edit playlist" })).toBeVisible();

  await host.page.getByRole("button", { name: "Close playlist editor", exact: true }).click();
  await expect(host.page.getByRole("dialog", { name: "Edit playlist" })).not.toBeVisible();
  await expect(host.page.getByRole("dialog", { name: "Spotify music setup" })).toBeVisible();

  await host.page.getByRole("button", { name: "Close music setup", exact: true }).click();
  await expect(host.page.getByRole("dialog", { name: "Spotify music setup" })).not.toBeVisible();
  await expect(host.page).toHaveURL(`/lobby/${roomId}`);
  await expect(host.page.getByRole("button", { name: "Start Game" }).first()).toBeVisible();
});
