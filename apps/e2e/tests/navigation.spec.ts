import { expect, test } from "./support/fixtures";
import {
  expectGamePage,
  homeJoinButton,
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
    const joinButton = homeJoinButton(page);
    await expect(joinButton).toBeVisible();
    await joinButton.click();
    await expect(page).toHaveURL("/join");
  }
});

test("an old Play link lands on Join", async ({ openPlayer }) => {
  const { page } = await openPlayer("Bookmark Player");

  await page.goto("/play");

  await expect(page).toHaveURL("/join");
  await expect(page.getByRole("heading", { name: "Join a game", level: 1 })).toBeVisible();
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

test("a link imports without login, and the editors close one level at a time without leaving the lobby", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Playlist Host");
  const roomId = await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Music Choose songs" }).click();
  const music = host.page.getByRole("dialog", { name: "Choose the songs" });
  await expect(music.getByRole("button", { name: "Connect Spotify" })).toBeVisible();

  // Links, search and quick picks use the app's own Spotify access: no login first (`22` §4.8).
  await music
    .getByRole("searchbox", { name: "Search Spotify or paste a link" })
    .fill("spotify:playlist:TESTPLAYLIST1234567890");
  await music.getByRole("searchbox").press("Enter");
  await expect(host.page.getByText("10 songs added · 0 unavailable skipped")).toBeVisible();

  await music.getByRole("radio", { name: "Your decks" }).click();
  const roomDeck = music.getByRole("region", { name: "In this game" });
  await expect(roomDeck.getByText("10 songs", { exact: true })).toBeVisible();
  await roomDeck.getByRole("button", { name: "Edit songs" }).click();
  await expect(host.page.getByRole("dialog", { name: "Song list" })).toBeVisible();
  const firstTrack = host.page.getByRole("button", { name: /^E2E Track 1\b/ });
  await firstTrack.click();

  const releaseYearField = host.page.getByRole("spinbutton", {
    name: "Release year",
    exact: true,
  });
  await releaseYearField.fill("1977");
  await host.page.getByRole("button", { name: "Save song", exact: true }).click();
  await expect(releaseYearField).toHaveCount(0);

  await firstTrack.click();
  await expect(releaseYearField).toHaveValue("1977");

  await host.page.goBack();
  await expect(releaseYearField).toHaveCount(0);
  await expect(host.page.getByRole("dialog", { name: "Song list" })).toBeVisible();

  await host.page
    .getByRole("dialog", { name: "Song list" })
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(host.page.getByRole("dialog", { name: "Song list" })).not.toBeVisible();
  await expect(music).toBeVisible();

  // Login only changes playback; the Playback block drops its button once it lands.
  const popupPromise = host.page.waitForEvent("popup");
  await music.getByRole("button", { name: "Connect Spotify" }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(music.getByText("Spotify Premium · full songs")).toBeVisible();

  await music.getByRole("button", { name: "Back", exact: true }).click();
  await expect(music).not.toBeVisible();
  await expect(host.page).toHaveURL(`/lobby/${roomId}`);
  await expect(
    host.page.getByRole("button", { name: "Music 10 songs · Spotify Premium" }),
  ).toBeVisible();
  await expect(host.page.getByRole("button", { name: "Start game" })).toBeEnabled();
});
