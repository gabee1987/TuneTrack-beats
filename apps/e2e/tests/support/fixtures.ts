import { test as base, type BrowserContext } from "@playwright/test";
import {
  createNamedPage,
  expectLobbyPlayerCount,
  expectNoUnexpectedSpotifyRequests,
  hostRoom,
  joinFromDirectory,
  type PlayerPage,
} from "./roomPages";

export { expect } from "@playwright/test";

export interface TwoPlayerRoom {
  guest: PlayerPage;
  host: PlayerPage;
  roomId: string;
}

interface RoomFixtures {
  /** A browser context with a saved profile; closed after the test. */
  openPlayer: (displayName: string) => Promise<PlayerPage>;
  /** A hosted lobby the guest joined from the live directory. */
  openRoom: (displayNames: { guest: string; host: string }) => Promise<TwoPlayerRoom>;
  spotifyRequestGuard: void;
}

export const test = base.extend<RoomFixtures>({
  spotifyRequestGuard: [
    async ({ request }, use) => {
      await use();
      await expectNoUnexpectedSpotifyRequests(request);
    },
    { auto: true },
  ],

  openPlayer: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    await use(async (displayName) => {
      const player = await createNamedPage(browser, displayName);
      contexts.push(player.context);
      return player;
    });

    await Promise.all(contexts.map((context) => context.close()));
  },

  openRoom: async ({ openPlayer }, use) => {
    await use(async (displayNames) => {
      const guest = await openPlayer(displayNames.guest);
      const host = await openPlayer(displayNames.host);

      await guest.page.goto("/play");
      const roomId = await hostRoom(host.page);
      await joinFromDirectory(guest.page, roomId);
      await expectLobbyPlayerCount(guest.page, 2);
      await expectLobbyPlayerCount(host.page, 2);

      return { guest, host, roomId };
    });
  },
});
