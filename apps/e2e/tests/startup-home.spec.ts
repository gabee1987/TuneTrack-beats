import { expect, test } from "./support/fixtures";

test("a new device hosts with one tap and the Name sheet, then Home says who is playing", async ({
  openPlayer,
}) => {
  const { page } = await openPlayer(null);
  await page.goto("/");
  await expect(page.getByText(/^Playing as/)).toHaveCount(0);

  await page.getByRole("button", { name: "Host a game", exact: true }).click();
  const nameField = page.getByRole("textbox", { name: "Your name" });
  await expect(nameField).toBeFocused();
  await nameField.fill("Home Host");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page).toHaveURL(/\/lobby\/[^/?#]+$/);

  await page.goto("/");
  await expect(page.getByText("Playing as Home Host", { exact: true })).toBeVisible();
});
