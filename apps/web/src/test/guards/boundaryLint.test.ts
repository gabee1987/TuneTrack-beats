import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * Proves the architecture-boundary rules in the root `eslint.config.js` (03 §4) still fire.
 * Each case lints one import line as if it lived at the given path; the files do not exist.
 */
const eslint = new ESLint({ cwd: resolve(process.cwd(), "../..") });

async function boundaryRulesHit(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${code}\n`, { filePath });

  return (result?.messages ?? [])
    .map((message) => message.ruleId ?? "")
    .filter(
      (ruleId) => ruleId.endsWith("no-restricted-imports") || ruleId === "no-restricted-syntax",
    );
}

const FORBIDDEN: Array<[string, string, string]> = [
  [
    "the engine importing a transport",
    "packages/game-engine/src/Fixture.ts",
    'export { Server } from "socket.io";',
  ],
  [
    "the engine importing the shared barrel",
    "packages/game-engine/src/Fixture.ts",
    'export { ROOM_ID_SCHEMA } from "@tunetrack/shared";',
  ],
  [
    "one page importing another",
    "apps/web/src/pages/GamePage/Fixture.ts",
    'export { useLobbyPageController } from "../LobbyPage/hooks/useLobbyPageController";',
  ],
  ["web code importing Zod", "apps/web/src/features/rooms/Fixture.ts", 'export { z } from "zod";'],
  [
    "a feature importing a page",
    "apps/web/src/features/rooms/Fixture.ts",
    'export { GamePage } from "../../pages/GamePage/GamePage";',
  ],
  [
    "a mobile assembly importing the desktop one",
    "apps/web/src/pages/GamePage/mobile/Fixture.ts",
    'export { GamePageDesktop } from "../desktop/GamePageDesktop";',
  ],
  [
    "a service importing React",
    "apps/web/src/services/session/Fixture.ts",
    'export { useState } from "react";',
  ],
  [
    "a component importing the socket client",
    "apps/web/src/features/rooms/Fixture.tsx",
    'export { getSocket } from "../../services/socket/socketClient";',
  ],
  [
    "a component importing framer-motion",
    "apps/web/src/pages/HomePage/Fixture.tsx",
    'export { m } from "framer-motion";',
  ],
  [
    "rooms importing Spotify code",
    "apps/server/src/rooms/Fixture.ts",
    'export { SpotifyOrchestrator } from "../spotify/SpotifyOrchestrator";',
  ],
  [
    "a handler importing a deck module",
    "apps/server/src/realtime/handlers/Fixture.ts",
    'export { trackDedupe } from "../../decks/trackDedupe";',
  ],
  [
    "web code reading localStorage directly",
    "apps/web/src/features/rooms/Fixture.ts",
    'export const value = window.localStorage.getItem("TEST_KEY");',
  ],
];

const ALLOWED: Array<[string, string, string]> = [
  [
    "the engine importing shared constants",
    "packages/game-engine/src/Fixture.ts",
    'export { MAX_TT_TOKEN_COUNT } from "@tunetrack/shared/constants";',
  ],
  [
    "a page importing its own hook",
    "apps/web/src/pages/GamePage/mobile/Fixture.ts",
    'export { useGamePageController } from "../hooks/useGamePageController";',
  ],
  [
    "a page importing a feature",
    "apps/web/src/pages/LobbyPage/Fixture.ts",
    'export { useI18n } from "../../features/i18n";',
  ],
  [
    "a motion helper importing framer-motion",
    "apps/web/src/features/motion/Fixture.tsx",
    'export { m } from "framer-motion";',
  ],
];

describe("architecture boundary lint", () => {
  it.each(FORBIDDEN)("rejects %s", async (_case, filePath, code) => {
    expect(await boundaryRulesHit(filePath, code)).not.toEqual([]);
  });

  it.each(ALLOWED)("allows %s", async (_case, filePath, code) => {
    expect(await boundaryRulesHit(filePath, code)).toEqual([]);
  });
});
