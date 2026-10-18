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
  // The Invite card shows the room's own code, never the route's fallback.
  const roomId = decodeURIComponent(new URL(page.url()).pathname.split("/").at(-1) ?? "");
  expect(roomId).not.toBe("lobby");
  await expect(
    page.getByRole("main").getByLabel(`Room code ${roomId.split("").join(" ")}`),
  ).toHaveText(roomId);

  await page.goto("/");
  await expect(page.getByText("Playing as Home Host", { exact: true })).toBeVisible();
});
