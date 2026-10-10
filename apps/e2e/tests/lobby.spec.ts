import { expect, test } from "./support/fixtures";
import { expectLobbyRoster, hostRoom, startGame } from "./support/roomPages";

test("a guest joins a newly hosted room from the live directory", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({ guest: "Guest Player", host: "Host Player" });

  await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
  await expectLobbyRoster(host.page, "Guest Player");
  await expectLobbyRoster(guest.page, "Host Player");
});

test("a saved player profile joins from a direct invite in one action", async ({ openPlayer }) => {
  const host = await openPlayer("Invite Host");
  const guest = await openPlayer("Invite Guest");

  const roomId = await hostRoom(host.page);
  await guest.page.goto(`/join/${roomId}`);

  await expect(guest.page.getByRole("heading", { name: roomId })).toBeVisible();
  const joinButton = guest.page.getByRole("button", { name: "Join room" });
  await expect(joinButton).toBeEnabled();
  await joinButton.click();

  await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
  await expect(guest.page).not.toHaveURL(/playerName=|intent=/);
  await expectLobbyRoster(host.page, "Invite Guest");
  await expectLobbyRoster(guest.page, "Invite Host");
});

test("the host starts the game for both players", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({ guest: "Game Guest", host: "Game Host" });

  await startGame(host.page, roomId, guest.page);
});
