import { expect, test } from "./support/fixtures";
import type { Page } from "@playwright/test";
import { choosePracticeDeck, expectGamePage, hostRoom } from "./support/roomPages";

/**
 * Creating or renaming a room replaces the lobby URL, so the old lobby is still drawn while it
 * leaves; it is hidden from the accessibility tree, which text and label lookups do not check.
 */
function lobby(page: Page) {
  return page.getByRole("main");
}

test("the host sees the code, Start waits for songs with its reason, then the game starts", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Lobby Host");
  const roomId = await hostRoom(host.page);

  await expect(host.page.getByRole("heading", { name: "Get the room ready" })).toBeVisible();
  await expect(lobby(host.page).getByLabel(`Room code ${roomId.split("").join(" ")}`)).toHaveText(
    roomId,
  );
  await expect(lobby(host.page).getByText("Waiting for friends to join…")).toBeVisible();
  const start = host.page.getByRole("button", { name: "Start game" });
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription("Choose songs or use the practice deck first.");

  await choosePracticeDeck(host.page);

  await expect(host.page.getByRole("button", { name: /^Music Practice deck/ })).toBeVisible();
  await expect(start).toBeEnabled();
  await expect(start).toHaveAccessibleDescription(
    "You're the only player — fine for a practice round.",
  );
  await start.click();
  await expectGamePage(host.page, roomId);
});

test("a guest arriving shows in the host's lobby and the guest waits for Start", async ({
  openRoom,
}) => {
  const { guest, host } = await openRoom({ guest: "Strip Guest", host: "Strip Host" });

  await expect(lobby(host.page).getByText("Waiting for friends to join…")).toHaveCount(0);
  await expect(
    lobby(host.page).getByRole("listitem").filter({ hasText: "Strip Guest" }),
  ).toBeVisible();
  await expect(guest.page.getByRole("heading", { name: "You're in" })).toBeVisible();
  await expect(
    lobby(guest.page).getByText("The game starts when Strip Host taps Start."),
  ).toBeVisible();
  await expect(guest.page.getByRole("button", { name: "Start game" })).toHaveCount(0);

  // The page's own exit button; Back asks the same question.
  await guest.page.getByRole("button", { name: "Leave room" }).click();
  await guest.page
    .getByRole("dialog", { name: "Leave the room?" })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(guest.page).toHaveURL("/");
});

test("the host closes the room from Back and lands on Home", async ({ openPlayer }) => {
  const host = await openPlayer("Closing Host");
  await hostRoom(host.page);

  await host.page.getByRole("button", { name: "Back" }).click();
  await host.page
    .getByRole("dialog", { name: "Close the room?" })
    .getByRole("button", { name: "Close room" })
    .click();

  await expect(host.page).toHaveURL("/");
});

test("the host changes the room code from the Invite card", async ({ openPlayer }) => {
  const host = await openPlayer("Rename Host");
  const roomId = await hostRoom(host.page);
  // Codes are at most 12 characters; the clock keeps parallel runs apart.
  const nextCode = `rn_${Date.now().toString(36).slice(-6)}`;

  await host.page.getByRole("button", { name: "Change code" }).click();
  const field = host.page.getByRole("dialog").getByRole("textbox", { name: "Room code" });
  await field.fill(roomId.toUpperCase());
  await expect(host.page.getByRole("alert")).toContainText("Codes match in any case");
  await field.fill(nextCode);
  await host.page.getByRole("button", { name: "Rename room" }).click();

  await expect(host.page.getByRole("dialog")).toHaveCount(0);
  await expect(host.page).toHaveURL(`/lobby/${nextCode}`);
  await expect(
    lobby(host.page).getByLabel(`Room code ${nextCode.split("").join(" ")}`),
  ).toBeVisible();
});
