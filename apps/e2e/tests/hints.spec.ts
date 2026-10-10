import { expect, test } from "./support/fixtures";
import { expectGamePage, startGame } from "./support/roomPages";

test("a first-run player sees the placement rules before timeline details", async ({
  openRoom,
}) => {
  const { host, roomId } = await openRoom({ guest: "Hint Guest", host: "Hint Host" });
  await startGame(host.page, roomId);

  const placementHint = host.page.getByRole("dialog", { name: "Place the song" });
  await expect(placementHint).toContainText(
    "Drag the mystery card to where its release year belongs in your timeline.",
  );
  await placementHint.getByRole("button", { name: "Dismiss hint" }).click();
  await expect(placementHint).toHaveCount(0);

  await host.page.reload();
  await expectGamePage(host.page, roomId);
  // The scheduler shows the unseen hint with the lowest priority, and the placement hint has the
  // lowest of all; once a later hint is up, the placement hint was passed over.
  await expect(host.page.getByRole("button", { name: "Dismiss hint" })).toBeVisible();
  await expect(placementHint).toHaveCount(0);
});
