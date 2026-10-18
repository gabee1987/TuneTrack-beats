import { expect, test } from "./support/fixtures";
import { expectGamePage, openGameMenu, startGame } from "./support/roomPages";

test.use({ hints: true });

test("a first game walks through the hints one at a time, and Show hints again restarts them", async ({
  openRoom,
}) => {
  const { host, roomId } = await openRoom({ guest: "Hint Guest", host: "Hint Host" });
  await startGame(host.page, roomId);

  const placementHint = host.page.getByRole("status", { name: "Place the song" });
  const confirmHint = host.page.getByRole("status", { name: "Lock in your answer" });
  await expect(placementHint).toContainText(
    "Drag the mystery card to where its release year belongs in your timeline.",
  );
  await placementHint.getByRole("button", { name: "Dismiss hint" }).click();
  await expect(placementHint).toHaveCount(0);
  await expect(confirmHint).toBeVisible();

  // An acknowledged hint stays seen; one only shown comes back at its next moment.
  await host.page.reload();
  await expectGamePage(host.page, roomId);
  await expect(confirmHint).toBeVisible();
  await expect(placementHint).toHaveCount(0);

  await openGameMenu(host.page);
  await host.page.getByRole("button", { name: "View", exact: true }).click();
  await host.page.getByRole("button", { name: "Show hints again" }).click();
  await host.page.getByRole("button", { name: "Close menu" }).click();
  await expect(placementHint).toBeVisible();
});
