import { expect, test } from "./support/fixtures";
import { editRules, expectHeaderStatus, setRuleNumber, startGame } from "./support/roomPages";

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

test("both players see the winner when the target card count is reached", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({ guest: "Win Guest", host: "Win Host" });

  await editRules(host.page, async () => {
    await setRuleNumber(host.page, "Songs to win", 3);
    await setRuleNumber(host.page, "Songs to start with", 2);
    const tokens = host.page.getByRole("switch", { name: "Tokens" });
    await tokens.click();
    await expect(tokens).toHaveAttribute("aria-checked", "true");
    await setRuleNumber(host.page, "Starting tokens", 3);
  });

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
