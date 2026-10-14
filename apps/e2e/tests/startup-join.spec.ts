import { expect, test } from "./support/fixtures";
import { expectLobbyRoster, hostRoom } from "./support/roomPages";

test("a guest joins by a code typed in another case and lands on the room's own code", async ({
  openPlayer,
}) => {
  const host = await openPlayer("Code Host");
  const guest = await openPlayer("Code Guest");
  const roomId = await hostRoom(host.page);

  await guest.page.goto("/join");
  await guest.page.getByRole("textbox", { name: "Room code" }).fill(roomId.toUpperCase());
  await guest.page.getByRole("button", { name: "Join", exact: true }).click();

  await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
  await expectLobbyRoster(host.page, "Code Guest");
});

test("a wrong code is answered on the Join page", async ({ openPlayer }) => {
  const { page } = await openPlayer("Wrong Code Guest");

  await page.goto("/join");
  await page.getByRole("textbox", { name: "Room code" }).fill("NO_ROOM_9");
  await page.getByRole("button", { name: "Join", exact: true }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "No room with that code. Check it with your host.",
  );
  await expect(page).toHaveURL("/join");
});
