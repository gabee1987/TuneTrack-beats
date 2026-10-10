import { expect, test } from "./support/fixtures";
import { startGame } from "./support/roomPages";

test("the game page says when the connection drops and refuses moves until it is back", async ({
  openRoom,
}) => {
  // The guest stays online: a room whose every player is offline closes after the shortened
  // E2E grace period, which a slow reconnect would outlive.
  const { host, roomId } = await openRoom({ guest: "Banner Guest", host: "Banner Host" });
  await startGame(host.page, roomId);
  // The lobby, with its own connection chip, stays mounted for its exit animation.
  await expect(host.page.getByRole("button", { name: "Start Game" })).toHaveCount(0);
  const offlineBanner = host.page.getByText("You are offline", { exact: true });
  await expect(offlineBanner).toHaveCount(0);

  await host.context.setOffline(true);
  await expect(offlineBanner).toBeVisible({ timeout: 1_000 });

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    host.page
      .getByText(
        "You are offline, so this action was not sent. Try again once you are reconnected.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();

  await host.context.setOffline(false);
  await expect(offlineBanner).toHaveCount(0);
  await expect(host.page.getByText("Reconnecting…", { exact: true })).toHaveCount(0);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByRole("button", { name: "Next song", exact: true })).toBeVisible();
});
