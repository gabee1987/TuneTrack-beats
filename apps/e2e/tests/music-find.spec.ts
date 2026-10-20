import { expect, test } from "./support/fixtures";
import { hostRoom } from "./support/roomPages";

// Search and quick picks use the app's own Spotify access: no login first (`22` §4.8).

test("a song found by search goes into the game without a Spotify login", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Find Host");
  await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Music Choose songs" }).click();
  const music = host.page.getByRole("dialog", { name: "Choose the songs" });
  await expect(music.getByRole("button", { name: "Connect Spotify" })).toBeVisible();

  await music.getByRole("searchbox", { name: "Search Spotify or paste a link" }).fill("E2E Track");
  await music.getByRole("searchbox").press("Enter");
  await music.getByRole("button", { name: "Add E2E Track 1" }).click();

  await music.getByRole("radio", { name: "Your decks" }).click();
  await expect(
    music.getByRole("region", { name: "In this game" }).getByText(/^1 songs?$/),
  ).toBeVisible();
});

test("a quick pick builds a deck without a Spotify login", async ({ openPlayer }) => {
  const host = await openPlayer("Pick Host");
  await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Music Choose songs" }).click();
  const music = host.page.getByRole("dialog", { name: "Choose the songs" });

  await music.getByRole("radio", { name: "Quick picks" }).click();
  await music.getByRole("button", { name: /^80s Hits/ }).click();

  const pick = host.page.getByRole("dialog", { name: "Song list" });
  await expect(pick.getByRole("button", { name: /^E2E Track 1\b/ })).toBeVisible();
  await pick.getByRole("button", { name: "Use in game" }).click();
  await expect(host.page.getByRole("button", { name: /^Music 10 songs/ })).toBeVisible();
});
