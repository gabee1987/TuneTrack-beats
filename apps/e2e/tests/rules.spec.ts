import { expect, test } from "./support/fixtures";
import { editRules, openRulesSheet, setRuleNumber } from "./support/roomPages";

test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, "the desktop lobby gets its Rules card in plan 22 S6");
});

test("the host edits the rules in the sheet and the Rules card sums them up", async ({
  openRoom,
}) => {
  const { host } = await openRoom({ guest: "Setting Guest", host: "Setting Host" });
  const rulesCard = host.page.getByRole("button", { name: /^Rules\b/ });
  await expect(rulesCard).toContainText("10 songs to win · 1 to start · tokens off");

  await editRules(host.page, async () => {
    const sheet = host.page.getByRole("dialog", { name: "Rules" });
    await expect(sheet.getByRole("button", { name: "Reset to defaults" })).toBeDisabled();
    await setRuleNumber(sheet, "Songs to win", 5);
    const tokens = sheet.getByRole("switch", { name: "Tokens" });
    await tokens.click();
    await expect(tokens).toHaveAttribute("aria-checked", "true");
    await expect(sheet.getByRole("radio", { name: "10 s" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(sheet.getByRole("button", { name: "Reset to defaults" })).toBeEnabled();
  });

  await expect(rulesCard).toContainText("5 songs to win · 1 to start · tokens on, Beat! 10 s");
});

test("the host removes a player only after confirming it", async ({ openRoom }) => {
  const { guest, host } = await openRoom({ guest: "Removed Guest", host: "Removing Host" });

  const sheet = await openRulesSheet(host.page);
  await expect(sheet.getByRole("heading", { name: "Players (2)" })).toBeVisible();
  const guestRow = sheet.getByRole("listitem").filter({ hasText: "Removed Guest" });
  await guestRow.getByRole("button", { name: /^Removed Guest/ }).click();
  const remove = guestRow.getByRole("button", { name: "Remove Removed Guest from the room" });

  await remove.click();
  const confirm = host.page.getByRole("dialog", { name: "Remove Removed Guest from the room?" });
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(sheet.getByRole("heading", { name: "Players (2)" })).toBeVisible();

  await remove.click();
  await confirm.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(sheet.getByRole("heading", { name: "Players (1)" })).toBeVisible();
  await expect(guest.page.getByText(/^You were removed from /)).toBeVisible();
});
