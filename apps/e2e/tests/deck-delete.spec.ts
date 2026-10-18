import { expect, test } from "./support/fixtures";
import { hostRoom } from "./support/roomPages";

test("a saved deck is deleted after the confirm, and More still opens afterwards", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Deck Host");
  await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Music Choose songs" }).click();
  const music = host.page.getByRole("dialog", { name: "Choose the songs" });
  await music
    .getByRole("searchbox", { name: "Search Spotify or paste a link" })
    .fill("spotify:playlist:TESTPLAYLIST1234567890");
  await music.getByRole("searchbox").press("Enter");
  await expect(host.page.getByText("10 songs added · 0 unavailable skipped")).toBeVisible();

  await music.getByRole("radio", { name: "Your decks" }).click();
  for (const name of ["E2E Deck One", "E2E Deck Two"]) {
    await music
      .getByRole("region", { name: "In this game" })
      .getByRole("button", { name: "Save to Your decks" })
      .click();
    const saveDialog = host.page.getByRole("dialog", { name: "Save to Your decks" });
    const asNew = saveDialog.getByRole("button", { name: "Save as a new deck" });
    if (name === "E2E Deck Two") await asNew.click();
    await saveDialog.getByRole("textbox", { name: "Deck name" }).fill(name);
    await saveDialog.getByRole("button", { name: "Save deck" }).click();
    await expect(saveDialog).not.toBeVisible();
    const list = host.page.getByRole("dialog", { name: "Song list" });
    if (await list.isVisible()) await list.getByRole("button", { name: "Back" }).click();
  }

  await music.getByRole("button", { name: "More for E2E Deck One" }).click();
  await host.page.getByRole("button", { name: "Delete deck" }).click();
  const confirm = host.page.getByRole("dialog", { name: "Delete “E2E Deck One”?" });
  await confirm.getByRole("button", { name: "Delete deck" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(music.getByRole("button", { name: "More for E2E Deck One" })).toHaveCount(0);

  await music.getByRole("button", { name: "More for E2E Deck Two" }).click();
  await expect(host.page.getByRole("dialog", { name: "E2E Deck Two" })).toBeVisible();
});
