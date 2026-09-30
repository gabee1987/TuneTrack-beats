import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const playerProfileStorageKey = "tunetrack.playerProfile.v1";

test.afterEach(async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3102/requests");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toEqual({ unexpectedRequests: [] });
});

test("a guest joins a newly hosted room from the live directory", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Guest Player");
  const host = await createNamedPage(browser, "Host Player");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();

    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expectLobbyPlayers(host.page, "Host Player", "Guest Player");
    await expectLobbyPlayers(guest.page, "Guest Player", "Host Player");
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("the host starts the game for both players", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Game Guest");
  const host = await createNamedPage(browser, "Game Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();

    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a correct placement is revealed before the turn advances", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Core Guest");
  const host = await createNamedPage(browser, "Core Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();

    await expect(host.page.getByText("Core Guest's turn", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("an incorrect placement is discarded before the turn advances", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Discard Guest");
  const host = await createNamedPage(browser, "Discard Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();

    await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();
    await expect(host.page.getByText("Your turn", { exact: true }).first()).toBeVisible();

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(host.page.getByText("Wrong placement.", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByText("Wrong placement.", { exact: true }).first()).toBeVisible();
    await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
    await expect(guest.page.getByLabel("2 cards").first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();

    await expect(
      host.page.getByText("Discard Guest's turn", { exact: true }).first(),
    ).toBeVisible();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a guest challenge is resolved by the server before the turn advances", async ({
  browser,
}) => {
  const guest = await createNamedPage(browser, "Challenge Guest");
  const host = await createNamedPage(browser, "Challenge Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    const tokenModeSwitch = host.page.getByRole("switch", { name: "Enable token mode" }).first();
    await tokenModeSwitch.click();
    await expect(tokenModeSwitch).toHaveAttribute("aria-checked", "true");
    const challengeWindowSelect = host.page
      .getByRole("combobox", { name: "Challenge window", exact: true })
      .first();
    await challengeWindowSelect.selectOption("manual");
    await expect(challengeWindowSelect).toHaveValue("manual");

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
    const beatButton = guest.page.getByRole("button", { name: /^Beat!/ });
    await expect(beatButton).toBeVisible();
    await beatButton.click();

    await expect(
      guest.page.getByText("Choose the slot you believe is right, then confirm.", {
        exact: true,
      }),
    ).toBeVisible();
    await moveCurrentCardAfterTimelineCard(guest.page);
    await guest.page.getByRole("button", { name: "Confirm Beat", exact: true }).click();

    await expect(host.page.getByText("Challenge failed.", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByText("Challenge failed.", { exact: true }).first()).toBeVisible();
    await expect(host.page.getByLabel("2 cards").first()).toBeVisible();
    await guest.page.getByRole("button", { name: "Show leaderboard" }).first().click();
    const guestLeaderboardEntry = guest.page
      .locator("article")
      .filter({ hasText: "Challenge Guest" });
    await expect(guestLeaderboardEntry.getByLabel("0 TT tokens")).toBeVisible();

    await host.page.getByRole("button", { name: "Next song", exact: true }).click();
    await expect(
      host.page.getByText("Challenge Guest's turn", { exact: true }).first(),
    ).toBeVisible();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("both players see the winner when the target card count is reached", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Win Guest");
  const host = await createNamedPage(browser, "Win Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

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

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);
    await expect(host.page.getByLabel("2 cards").first()).toBeVisible();

    await host.page.getByRole("button", { name: /^Buy/ }).click();

    await expect(host.page.getByLabel("3 cards").first()).toBeVisible();
    await expect(guest.page.getByLabel("3 cards").first()).toBeVisible();
    await expect(host.page.getByText("Game finished", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByText("Game finished", { exact: true }).first()).toBeVisible();

    await host.page.getByRole("button", { name: "Next song", exact: true }).click();

    await expect(host.page.getByRole("heading", { name: "You won the game!" })).toBeVisible();
    await expect(guest.page.getByRole("heading", { name: "Win Host won the game!" })).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a guest reconnects inside the recovery window and continues playing", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Recovery Guest");
  const host = await createNamedPage(browser, "Recovery Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

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
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();
    await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a host reconnects inside the recovery window and remains host", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Host Recovery Guest");
  const host = await createNamedPage(browser, "Host Recovery Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

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

    await expect(
      host.page.getByText("Host Recovery Guest's turn", { exact: true }).first(),
    ).toBeVisible();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a permanent host disconnect transfers host controls after the grace period", async ({
  browser,
}) => {
  const guest = await createNamedPage(browser, "Transfer Guest");
  const host = await createNamedPage(browser, "Transfer Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(guest.page, 2);
    await expectLobbyPlayerCount(host.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(host.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();

    await host.context.close();
    await expect(
      guest.page.getByText("Transfer Host went offline", { exact: true }).first(),
    ).toBeVisible();
    await expect(guest.page.getByText("Host", { exact: true }).first()).toBeVisible();

    await guest.page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(guest.page.getByText("Correct placement.", { exact: true }).first()).toBeVisible();
    await expect(guest.page.getByRole("button", { name: "Next song", exact: true })).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("an offline guest stays in the game while the host manually skips their turn", async ({
  browser,
}) => {
  const observer = await createNamedPage(browser, "Turn Observer");
  const guest = await createNamedPage(browser, "Turn Break Guest");
  const host = await createNamedPage(browser, "Turn Break Host");

  try {
    await Promise.all([observer.page.goto("/play"), guest.page.goto("/play")]);
    const roomId = await hostRoom(host.page);

    for (const page of [guest.page, observer.page]) {
      const directoryRoom = page.getByRole("button", {
        name: new RegExp(escapeRegex(roomId)),
      });
      await expect(directoryRoom).toBeVisible();
      await directoryRoom.click();
    }

    await expectLobbyPlayerCount(host.page, 3);
    await expectLobbyPlayerCount(guest.page, 3);
    await expectLobbyPlayerCount(observer.page, 3);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);
    await expectGamePage(observer.page, roomId);

    await host.page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(host.page.getByText(/^(Correct|Wrong) placement\.$/).first()).toBeVisible();
    await host.page.getByRole("button", { name: "Next song", exact: true }).click();
    await expect(guest.page.getByText("Your turn", { exact: true }).first()).toBeVisible();

    await guest.context.close();
    for (const page of [host.page, observer.page]) {
      await expect(
        page.getByText("Turn Break Guest went offline", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText("Turn Break Guest is offline", { exact: true }).first(),
      ).toBeVisible();
    }

    const skipTurnButton = host.page.getByRole("button", { name: "Skip Turn", exact: true });
    await expect(skipTurnButton).toBeVisible();
    await expect(observer.page.getByRole("button", { name: "Skip Turn", exact: true })).toHaveCount(
      0,
    );
    await skipTurnButton.click();

    await expect(
      host.page.getByText("Turn Observer's turn", { exact: true }).first(),
    ).toBeVisible();
    await expect(observer.page.getByText("Your turn", { exact: true }).first()).toBeVisible();

    await host.page.getByRole("button", { name: "Open game menu", exact: true }).click();
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
  } finally {
    await Promise.all([host.context.close(), guest.context.close(), observer.context.close()]);
  }
});

test("an in-game room closes after every player stays offline", async ({ browser }) => {
  const guest = await createNamedPage(browser, "Expiry Guest");
  const host = await createNamedPage(browser, "Expiry Host");

  try {
    await guest.page.goto("/play");
    const roomId = await hostRoom(host.page);
    const directoryRoom = guest.page.getByRole("button", {
      name: new RegExp(escapeRegex(roomId)),
    });

    await expect(directoryRoom).toBeVisible();
    await directoryRoom.click();
    await expectLobbyPlayerCount(host.page, 2);
    await expectLobbyPlayerCount(guest.page, 2);

    await host.page.getByRole("button", { name: "Start Game" }).first().click();
    await expectGamePage(host.page, roomId);
    await expectGamePage(guest.page, roomId);

    await guest.context.setOffline(true);
    await expect(
      host.page.getByText("Expiry Guest went offline", { exact: true }).first(),
    ).toBeVisible();
    await host.context.setOffline(true);

    await new Promise((resolve) => setTimeout(resolve, 2_500));
    await guest.context.setOffline(false);

    await expect(
      guest.page.getByRole("heading", { name: "This room is no longer available" }),
    ).toBeVisible();
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

test("a saved player profile joins from a direct invite in one action", async ({ browser }) => {
  const host = await createNamedPage(browser, "Invite Host");
  const guest = await createNamedPage(browser, "Invite Guest");

  try {
    const roomId = await hostRoom(host.page);
    await guest.page.goto(`/join/${roomId}`);

    await expect(guest.page.getByRole("heading", { name: roomId })).toBeVisible();
    const joinButton = guest.page.getByRole("button", { name: "Join room" });
    await expect(joinButton).toBeEnabled();
    await joinButton.click();

    await expect(guest.page).toHaveURL(`/lobby/${roomId}`);
    await expect(guest.page).not.toHaveURL(/playerName=|intent=/);
    await expectLobbyPlayers(host.page, "Invite Host", "Invite Guest");
    await expectLobbyPlayers(guest.page, "Invite Guest", "Invite Host");
  } finally {
    await Promise.all([host.context.close(), guest.context.close()]);
  }
});

async function createNamedPage(
  browser: Browser,
  displayName: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    class FakeSpotifyPlayer {
      private readonly listeners = new Map<string, (payload: unknown) => void>();

      public activateElement(): Promise<void> {
        return Promise.resolve();
      }

      public addListener(eventName: string, listener: (payload: unknown) => void): boolean {
        this.listeners.set(eventName, listener);
        return true;
      }

      public connect(): Promise<boolean> {
        queueMicrotask(() => this.listeners.get("ready")?.({ device_id: "E2E_DEVICE" }));
        return Promise.resolve(true);
      }

      public disconnect(): void {}

      public getCurrentState(): Promise<null> {
        return Promise.resolve(null);
      }

      public pause(): Promise<void> {
        return Promise.resolve();
      }

      public resume(): Promise<void> {
        return Promise.resolve();
      }

      public seek(): Promise<void> {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "Spotify", {
      configurable: true,
      value: { Player: FakeSpotifyPlayer },
    });
  });
  await context.addInitScript(
    ({ name, storageKey }) => {
      if (window.location.protocol === "about:") {
        return;
      }

      localStorage.setItem("tunetrack.language", "en");
      localStorage.setItem(
        storageKey,
        JSON.stringify({ displayName: name, hasCompletedSetup: true }),
      );
    },
    { name: displayName, storageKey: playerProfileStorageKey },
  );

  return { context, page: await context.newPage() };
}

async function hostRoom(page: Page): Promise<string> {
  await page.goto("/play");
  await page.getByRole("button", { name: "Host a game" }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?#]+$/);

  const roomId = new URL(page.url()).pathname.split("/").at(-1);
  if (!roomId) {
    throw new Error("The hosted lobby URL did not contain a room code.");
  }
  return decodeURIComponent(roomId);
}

async function expectLobbyPlayers(
  page: Page,
  ownDisplayName: string,
  otherDisplayName: string,
): Promise<void> {
  await expect(page.getByText(ownDisplayName, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("listitem").filter({ hasText: otherDisplayName }).first(),
  ).toBeVisible();
}

async function expectGamePage(page: Page, roomId: string): Promise<void> {
  await expect(page).toHaveURL(`/game/${roomId}`);
  await expect(page.getByRole("button", { name: /leaderboard/i }).first()).toBeVisible();
}

async function expectLobbyPlayerCount(page: Page, count: number): Promise<void> {
  const playerCountMetric = page.getByText("Players here", { exact: true }).locator("..");
  await expect(playerCountMetric.getByText(String(count), { exact: true }).first()).toBeVisible();
}

async function moveCurrentCardAfterTimelineCard(page: Page): Promise<void> {
  const currentCard = page.getByRole("button", { name: "Hidden Until Reveal" });
  const timelineCard = page.locator("article[data-timeline-card='true']");
  const isCurrentCardAfterTimelineCard = () =>
    timelineCard.evaluate(
      (card) =>
        card.parentElement?.nextElementSibling?.querySelector(
          "[aria-label='Hidden Until Reveal']",
        ) !== null,
    );

  await expect(currentCard).toHaveCount(1);
  await expect(timelineCard).toHaveCount(1);

  const currentCardBox = await currentCard.boundingBox();
  const timelineCardBox = await timelineCard.boundingBox();
  if (!currentCardBox || !timelineCardBox) {
    throw new Error("The timeline cards must be visible before dragging.");
  }

  await page.mouse.move(
    currentCardBox.x + currentCardBox.width / 2,
    currentCardBox.y + currentCardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    timelineCardBox.x + timelineCardBox.width - 4,
    timelineCardBox.y + timelineCardBox.height / 2,
    { steps: 10 },
  );
  await expect.poll(isCurrentCardAfterTimelineCard).toBe(true);
  await page.mouse.up();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect.poll(isCurrentCardAfterTimelineCard).toBe(true);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
