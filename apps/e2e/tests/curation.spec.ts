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
