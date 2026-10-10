import { expect, test } from "./support/fixtures";
import { expectHeaderStatus, startGame } from "./support/roomPages";
import { moveCurrentCardAfterTimelineCard } from "./support/timeline";

test("a guest challenge is resolved by the server before the turn advances", async ({
  isMobile,
  openRoom,
}) => {
  test.fixme(isMobile, "B25: the phone's challenge-window picker has no accessible name");
  const { guest, host, roomId } = await openRoom({
    guest: "Challenge Guest",
    host: "Challenge Host",
  });

  const tokenModeSwitch = host.page.getByRole("switch", { name: "Enable token mode" }).first();
  await tokenModeSwitch.click();
  await expect(tokenModeSwitch).toHaveAttribute("aria-checked", "true");
  const challengeWindowSelect = host.page
    .getByRole("combobox", { name: "Challenge window", exact: true })
    .first();
  await challengeWindowSelect.selectOption("manual");
  await expect(challengeWindowSelect).toHaveValue("manual");

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

  await expect(host.page.getByText("Challenge failed.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Challenge failed.", { exact: true }).first()).toBeVisible();
  await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
  await guest.page.getByRole("button", { name: "Show leaderboard" }).first().click();
  const guestLeaderboardEntry = guest.page
    .locator("article")
    .filter({ hasText: "Challenge Guest" });
  await expect(guestLeaderboardEntry.getByLabel("0 TT tokens")).toBeVisible();

  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(host.page, "Challenge Guest's turn");
  await expectHeaderStatus(guest.page, "Your turn");
});
