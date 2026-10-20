import { expect, test } from "./support/fixtures";
import { hostRoom } from "./support/roomPages";

test("the host reviews the flagged years one after another and the Music card counts down", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Curation Host");
  await hostRoom(host.page);
  await host.page.getByRole("button", { name: "Music Choose songs" }).click();
  const music = host.page.getByRole("dialog", { name: "Choose the songs" });
  await music
    .getByRole("searchbox", { name: "Search Spotify or paste a link" })
    .fill("spotify:playlist:TESTFLAGGED1234567890");
  await music.getByRole("searchbox").press("Enter");
  await expect(host.page.getByText("10 songs added · 0 unavailable skipped")).toBeVisible();
  await music.getByRole("button", { name: "Back", exact: true }).click();
  await expect(music).not.toBeVisible();

  // Two re-releases: the card's link opens the deck on the songs to check (`22` §4.9).
  await host.page.getByRole("button", { name: "2 years to check" }).click();
  const list = host.page.getByRole("dialog", { name: "Song list" });
  await expect(list.getByRole("button", { name: "Needs check (2)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await list.getByRole("button", { name: "Review 2 to check" }).click();

  const editor = host.page.getByRole("dialog", { name: "Song details" });
  await expect(editor.getByText("1 of 2")).toBeVisible();
  await editor.getByRole("button", { name: "Looks right" }).click();
  await expect(editor.getByText("2 of 2")).toBeVisible();
  await editor.getByRole("button", { name: "Next" }).click();
  await expect(editor).not.toBeVisible();
  await expect(list.getByRole("button", { name: "Needs check (1)" })).toBeVisible();

  await list.getByRole("button", { name: "Back", exact: true }).click();
  await expect(list).not.toBeVisible();
  await music.getByRole("button", { name: "Back", exact: true }).click();
  await expect(host.page.getByRole("button", { name: /^1 years? to check$/ })).toBeVisible();
});

test("a year fixed in a saved deck is written back at once, Undo restores it, and it survives a reload", async ({
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
  await music
    .getByRole("region", { name: "In this game" })
    .getByRole("button", { name: "Save to Your decks" })
    .click();
  const saveDialog = host.page.getByRole("dialog", { name: "Save to Your decks" });
  await saveDialog.getByRole("textbox", { name: "Deck name" }).fill("E2E Saved Deck");
  await saveDialog.getByRole("button", { name: "Save deck" }).click();
  await expect(saveDialog).not.toBeVisible();

  const list = host.page.getByRole("dialog", { name: "Song list" });
  const firstTrack = list.getByRole("button", { name: /^E2E Track 1\b/ });
  const editor = host.page.getByRole("dialog", { name: "Song details" });
  const yearField = editor.getByRole("spinbutton", { name: "Release year", exact: true });
  async function setYear(year: string) {
    await firstTrack.click();
    await yearField.fill(year);
    await editor.getByRole("button", { name: "Save song", exact: true }).click();
    await expect(yearField).toHaveCount(0);
  }

  await music.getByRole("button", { name: "Edit E2E Saved Deck" }).click();
  await firstTrack.click();
  const importedYear = await yearField.inputValue();
  await editor.getByRole("button", { name: "Cancel" }).click();
  await expect(yearField).toHaveCount(0);

  // Decision 24: the edit is kept at once and the toast takes it back.
  await setYear("1977");
  await host.page.getByRole("button", { name: "Undo" }).click();
  await firstTrack.click();
  await expect(yearField).toHaveValue(importedYear);
  await editor.getByRole("button", { name: "Cancel" }).click();
  await expect(yearField).toHaveCount(0);

  await setYear("1977");
  await expect(host.page.getByText("Saved to E2E Saved Deck")).toBeVisible();
  await host.page.reload();

  await host.page.getByRole("button", { name: /^Music/ }).click();
  await music.getByRole("radio", { name: "Your decks" }).click();
  await music.getByRole("button", { name: "Edit E2E Saved Deck" }).click();
  await firstTrack.click();
  await expect(yearField).toHaveValue("1977");
});
