import { expect, test } from "./support/fixtures";
import { expectHeaderStatus, startGame } from "./support/roomPages";

test("a correct placement is revealed before the turn advances", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({ guest: "Core Guest", host: "Core Host" });
  await startGame(host.page, roomId, guest.page);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();

  await expectHeaderStatus(host.page, "Core Guest's turn");
  await expectHeaderStatus(guest.page, "Your turn");
});

test("an incorrect placement is discarded before the turn advances", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Discard Guest",
    host: "Discard Host",
  });
  await startGame(host.page, roomId, guest.page);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(guest.page, "Your turn");

  await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(host.page, "Your turn");

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(host.page.getByText("Wrong placement.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Wrong placement.", { exact: true }).first()).toBeVisible();
  await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
  await expect(guest.page.getByLabel("2 cards").first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();

  await expectHeaderStatus(host.page, "Discard Guest's turn");
  await expectHeaderStatus(guest.page, "Your turn");
});

test("both players see the winner when the target card count is reached", async ({
  browserName,
  isMobile,
  openRoom,
}) => {
  test.fixme(
    browserName === "webkit" && !isMobile,
    "B27: a starting-token tick sometimes does not stick on desktop WebKit",
  );
  const { guest, host, roomId } = await openRoom({ guest: "Win Guest", host: "Win Host" });

  await host.page
    .getByRole("button", { name: "Cards needed to win: 3", exact: true })
    .first()
    .click();
  await expect(
    host.page.getByRole("slider", { name: "Cards needed to win" }).first(),
  ).toHaveAttribute("aria-valuenow", "3");
  await host.page
    .getByRole("button", { name: "Default starting cards: 2", exact: true })
    .first()
    .click();
  await expect(
    host.page.getByRole("slider", { name: "Default starting cards" }).first(),
  ).toHaveAttribute("aria-valuenow", "2");
  const tokenModeSwitch = host.page.getByRole("switch", { name: "Enable token mode" }).first();
  await tokenModeSwitch.click();
  await expect(tokenModeSwitch).toHaveAttribute("aria-checked", "true");
  await host.page
    .getByRole("button", {
      name: "Starting tokens for every player: 3",
      exact: true,
    })
    .first()
    .click();
  await expect(
    host.page.getByRole("slider", { name: "Starting tokens for every player" }).first(),
  ).toHaveAttribute("aria-valuenow", "3");

  await startGame(host.page, roomId, guest.page);
  await expect(host.page.getByLabel("2 cards").first()).toBeVisible();

  await host.page.getByRole("button", { name: /^Buy/ }).click();

  await expect(host.page.getByLabel("3 cards").first()).toBeVisible();
  await expect(guest.page.getByLabel("3 cards").first()).toBeVisible();
  await expectHeaderStatus(host.page, "Game finished");
  await expectHeaderStatus(guest.page, "Game finished");

  await host.page.getByRole("button", { name: "Next song", exact: true }).click();

  await expect(host.page.getByRole("heading", { name: "You won the game!" })).toBeVisible();
  await expect(guest.page.getByRole("heading", { name: "Win Host won the game!" })).toBeVisible();
});
