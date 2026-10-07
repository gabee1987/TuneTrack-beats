import { expect, test } from "@playwright/test";
import {
  createNamedPage,
  expectGamePage,
  expectNoUnexpectedSpotifyRequests,
  hostRoom,
} from "./support/roomPages";

test.afterEach(async ({ request }) => {
  await expectNoUnexpectedSpotifyRequests(request);
});

test("the game page says when the connection drops and refuses moves until it is back", async ({
  browser,
}) => {
  const host = await createNamedPage(browser, "Banner Host");

  try {
    const roomId = await hostRoom(host.page);
    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
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
  } finally {
    await host.context.close();
  }
});
