import { expect, test } from "./support/fixtures";
import {
  expectGamePage,
  expectHeaderStatus,
  expectLobbyPlayerCount,
  hostRoom,
  joinFromDirectory,
  openGameMenu,
  startGame,
} from "./support/roomPages";
import { expectRoomClosedOnServer } from "./support/roomProbe";

test("a guest reconnects inside the recovery window and continues playing", async ({
  openRoom,
}) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Recovery Guest",
    host: "Recovery Host",
  });
  await startGame(host.page, roomId, guest.page);

  await guest.context.setOffline(true);
  await expect(
    host.page.getByText("Recovery Guest went offline", { exact: true }).first(),
  ).toBeVisible();

  await guest.context.setOffline(false);
  await expect(
    host.page.getByText("Recovery Guest reconnected", { exact: true }).first(),
  ).toBeVisible();
  await expectGamePage(guest.page, roomId);
  await expect(
    guest.page.getByRole("heading", { name: "This room is no longer available" }),
  ).toHaveCount(0);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();

  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(guest.page, "Your turn");
  await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
});

test("a host reconnects inside the recovery window and remains host", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Host Recovery Guest",
    host: "Host Recovery Host",
  });
  await startGame(host.page, roomId, guest.page);

  await host.context.setOffline(true);
  await expect(
    guest.page.getByText("Host Recovery Host went offline", { exact: true }).first(),
  ).toBeVisible();

  await host.context.setOffline(false);
  await expect(
    guest.page.getByText("Host Recovery Host reconnected", { exact: true }).first(),
  ).toBeVisible();
  await expectGamePage(host.page, roomId);
  await expect(
    host.page.getByText("A room with that name already exists.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    host.page.getByRole("heading", { name: "This room is no longer available" }),
  ).toHaveCount(0);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();

  const nextSongButton = host.page.getByRole("button", { name: "Next song", exact: true });
  await expect(nextSongButton).toBeVisible();
  await nextSongButton.click();

  await expectHeaderStatus(host.page, "Host Recovery Guest's turn");
  await expectHeaderStatus(guest.page, "Your turn");
});

test("a permanent host disconnect transfers host controls after the grace period", async ({
  openRoom,
}) => {
  const { guest, host, roomId } = await openRoom({
    guest: "Transfer Guest",
    host: "Transfer Host",
  });
  await startGame(host.page, roomId, guest.page);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(guest.page, "Your turn");

  await host.context.close();
  await expect(
    guest.page.getByText("Transfer Host went offline", { exact: true }).first(),
  ).toBeVisible();
  await expect(guest.page.getByText("Host", { exact: true }).first()).toBeVisible();

  await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  await expect(guest.page.getByRole("button", { name: "Next song", exact: true })).toBeVisible();
});

test("an offline guest stays in the game while the host manually skips their turn", async ({
  openPlayer,
}) => {
  const observer = await openPlayer("Turn Observer");
  const guest = await openPlayer("Turn Break Guest");
  const host = await openPlayer("Turn Break Host");

  await Promise.all([observer.page.goto("/play"), guest.page.goto("/play")]);
  const roomId = await hostRoom(host.page);
  for (const page of [guest.page, observer.page]) {
    await joinFromDirectory(page, roomId);
  }
  for (const page of [host.page, guest.page, observer.page]) {
    await expectLobbyPlayerCount(page, 3);
  }
  await startGame(host.page, roomId, guest.page, observer.page);

  await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(host.page.getByText(/^(Correct|Wrong) placement\.$/).first()).toBeVisible();
  await host.page.getByRole("button", { name: "Next song", exact: true }).click();
  await expectHeaderStatus(guest.page, "Your turn");

  await guest.context.close();
  for (const page of [host.page, observer.page]) {
    await expect(
      page.getByText("Turn Break Guest went offline", { exact: true }).first(),
    ).toBeVisible();
    await expectHeaderStatus(page, "Turn Break Guest is offline");
  }

  const skipTurnButton = host.page.getByRole("button", { name: "Skip Turn", exact: true });
  await expect(skipTurnButton).toBeVisible();
  await expect(observer.page.getByRole("button", { name: "Skip Turn", exact: true })).toHaveCount(
    0,
  );
  await skipTurnButton.click();

  await expectHeaderStatus(host.page, "Turn Observer's turn");
  await expectHeaderStatus(observer.page, "Your turn");

  await openGameMenu(host.page);
  const retainedGuest = host.page.getByRole("listitem").filter({ hasText: "Turn Break Guest" });
  await expect(retainedGuest).toBeVisible();
  await expect(retainedGuest.getByText("Offline", { exact: true })).toBeVisible();
  await retainedGuest
    .getByRole("button", {
      name: "Show host transfer controls for Turn Break Guest",
      exact: true,
    })
    .click();
  await expect(
    retainedGuest.getByRole("button", { name: "Kick player", exact: true }),
  ).toBeVisible();
});

test("an in-game room closes after every player stays offline", async ({ openRoom }) => {
  const { guest, host, roomId } = await openRoom({ guest: "Expiry Guest", host: "Expiry Host" });
  await startGame(host.page, roomId, guest.page);

  await guest.context.setOffline(true);
  await expect(
    host.page.getByText("Expiry Guest went offline", { exact: true }).first(),
  ).toBeVisible();
  await host.context.setOffline(true);

  await expectRoomClosedOnServer(roomId);
  await guest.context.setOffline(false);

  await expect(
    guest.page.getByRole("heading", { name: "This room is no longer available" }),
  ).toBeVisible();
});
