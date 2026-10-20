import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { startGame } from "./support/roomPages";

/** The leaving lobby is still drawn while the game enters; only the game page is checked. */
function gamePage(page: Page) {
  return page.getByRole("main").filter({ has: page.getByRole("button", { name: /leaderboard/i }) });
}

// The guest lobby itself is covered by `host-lobby.spec.ts`; the notes' timing by unit tests.
test("as the game starts the guest learns it is silent and the host sees the practice note", async ({
  openRoom,
}) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Handover Guest",
    host: "Handover Host",
  });

  await startGame(host.page, roomId, guest.page);

  await expect(guest.page.getByText("Game on! This round has no music.")).toBeVisible();
  await expect(gamePage(host.page).getByText("Practice deck · no audio")).toBeVisible();
  await expect(host.page.getByText("Game on! This round has no music.")).toHaveCount(0);
});
