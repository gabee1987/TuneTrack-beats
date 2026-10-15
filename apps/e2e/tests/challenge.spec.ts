import { expect, test } from "./support/fixtures";
import { editRules, expectHeaderStatus, startGame } from "./support/roomPages";
import { moveCurrentCardAfterTimelineCard } from "./support/timeline";

test("a guest challenge is resolved by the server before the turn advances", async ({
  openRoom,
}) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Challenge Guest",
    host: "Challenge Host",
  });

  await editRules(host.page, async () => {
    const tokens = host.page.getByRole("switch", { name: "Tokens" });
    await tokens.click();
    await expect(tokens).toHaveAttribute("aria-checked", "true");
    // The longest window, so the guest's claim never races the timer.
    const longest = host.page
      .getByRole("radiogroup", { name: "Beat! window" })
      .getByRole("radio", { name: "30 s" });
    await longest.click();
    await expect(longest).toHaveAttribute("aria-checked", "true");
  });

  await startGame(host.page, roomId, guest.page);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  const beatButton = guest.page.getByRole("button", { name: /^Beat!/ });
  await expect(beatButton).toBeVisible();
  await beatButton.click();

  await expect(
    guest.page.getByText("Choose the slot you believe is right, then confirm.", {
      exact: true,
    }),
  ).toBeVisible();
  await moveCurrentCardAfterTimelineCard(guest.page);
  await guest.page.getByRole("button", { name: "Confirm Beat", exact: true }).click();

  await expect(host.page.getByText("Beat! failed.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Beat! failed.", { exact: true }).first()).toBeVisible();
  await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
  await guest.page.getByRole("button", { name: "Show leaderboard" }).first().click();
  const guestLeaderboardEntry = guest.page
    .locator("article")
    .filter({ hasText: "Challenge Guest" });
  await expect(guestLeaderboardEntry.getByLabel("0 tokens")).toBeVisible();

  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(host.page, "Challenge Guest's turn");
  await expectHeaderStatus(guest.page, "Your turn");
});
