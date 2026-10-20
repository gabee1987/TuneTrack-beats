import {
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared/client";
import { describe, expect, it } from "vitest";
import {
  TEST_HOST_ID,
  buildLobbyRoomState,
  buildPlayer,
  buildRoomSettings,
} from "../../../test/roomStateFixtures";
import {
  selectDeckMeter,
  selectLobbySetup,
  selectPlayersStrip,
  selectRulesSummary,
  type LobbySetupInput,
} from "./lobbySetupModel";

const practiceDeck: Partial<PublicRoomSettings> = {
  deckSource: "practice",
  importedTrackCount: 60,
};

function buildInput(
  settings: Partial<PublicRoomSettings> = practiceDeck,
  overrides: Partial<LobbySetupInput> = {},
): LobbySetupInput {
  const roomSettings = buildRoomSettings(settings);
  return {
    connectionStatus: "connected",
    currentPlayerId: TEST_HOST_ID,
    roomState: buildLobbyRoomState({ settings: roomSettings }),
    settings: roomSettings,
    startGameActionStatus: "idle",
    ...overrides,
  };
}

function players(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildPlayer({
      displayName: `Player ${index + 1}`,
      id: `player-${index + 1}`,
      isHost: index === 0,
    }),
  );
}

describe("selectLobbySetup start reasons", () => {
  it("lets a connected room with a deck start", () => {
    const { start } = selectLobbySetup(buildInput());

    expect(start).toMatchObject({ isBlocked: false, reason: null, playerCount: 2, songCount: 60 });
  });

  it("puts a lost connection first, then a room still being created, then a missing deck", () => {
    expect(
      selectLobbySetup(
        buildInput({ deckSource: "none" }, { connectionStatus: "reconnecting", roomState: null }),
      ).start.reason,
    ).toEqual({ kind: "connection", status: "reconnecting" });
    expect(
      selectLobbySetup(buildInput({ deckSource: "none" }, { roomState: null })).start.reason,
    ).toEqual({ kind: "creating" });
    expect(selectLobbySetup(buildInput({ deckSource: "none" })).start).toMatchObject({
      isBlocked: true,
      reason: { kind: "noDeck" },
      songCount: null,
    });
  });

  it("holds Start while the request is pending or retried", () => {
    expect(
      selectLobbySetup(buildInput(practiceDeck, { startGameActionStatus: "pending" })).start.reason,
    ).toEqual({ kind: "pending" });
    expect(
      selectLobbySetup(buildInput(practiceDeck, { startGameActionStatus: "retrying" })).start
        .reason,
    ).toEqual({ kind: "retrying" });
    expect(
      selectLobbySetup(buildInput(practiceDeck, { startGameActionStatus: "failed" })).start
        .isBlocked,
    ).toBe(false);
  });
});

describe("selectLobbySetup start notes", () => {
  it("warns that a Spotify deck without a connection plays silently", () => {
    const setup = selectLobbySetup(
      buildInput({ deckSource: "spotify", importedTrackCount: 60, spotifyAuthStatus: "none" }),
    );

    expect(setup.start).toMatchObject({ isBlocked: false, note: { kind: "noAudio" } });
  });

  it("warns about a short deck before mentioning a solo round", () => {
    const shortDeck = buildInput(
      { deckSource: "practice", importedTrackCount: 5 },
      { roomState: buildLobbyRoomState({ players: [buildPlayer()] }) },
    );

    expect(selectLobbySetup(shortDeck).start.note).toMatchObject({ kind: "shortDeck" });
  });

  it("tells a host alone in the room that a practice round is fine", () => {
    const solo = buildInput(practiceDeck, {
      roomState: buildLobbyRoomState({ players: [buildPlayer()] }),
    });

    expect(selectLobbySetup(solo).start.note).toEqual({ kind: "solo" });
    expect(selectLobbySetup(solo).isInviteDone).toBe(false);
  });
});

describe("selectLobbySetup steps and music", () => {
  it("marks Invite done from two players and Music done once a deck exists", () => {
    expect(selectLobbySetup(buildInput({ deckSource: "none" }))).toMatchObject({
      isInviteDone: true,
      isMusicDone: false,
      deckMeter: null,
      music: { kind: "none" },
    });
    expect(selectLobbySetup(buildInput()).isMusicDone).toBe(true);
  });

  it("names the Spotify playback each deck will get", () => {
    const spotify = { deckSource: "spotify", importedTrackCount: 40 } as const;

    expect(selectLobbySetup(buildInput(spotify)).music).toEqual({
      kind: "spotifyUnconnected",
      songCount: 40,
    });
    expect(
      selectLobbySetup(
        buildInput({ ...spotify, spotifyAuthStatus: "connected", spotifyAccountType: "premium" }),
      ).music,
    ).toEqual({ kind: "spotifyPremium", songCount: 40 });
    expect(
      selectLobbySetup(
        buildInput({ ...spotify, spotifyAuthStatus: "connected", spotifyAccountType: "free" }),
      ).music,
    ).toEqual({ kind: "spotifyFree", songCount: 40 });
  });

  it("counts years to check only on a Spotify deck", () => {
    expect(
      selectLobbySetup(buildInput({ deckSource: "spotify", tracksToCheckCount: 3 }))
        .tracksToCheckCount,
    ).toBe(3);
    expect(
      selectLobbySetup(buildInput({ deckSource: "practice", tracksToCheckCount: 3 }))
        .tracksToCheckCount,
    ).toBe(0);
  });

  it("never shows the route fallback as a code and names the host", () => {
    expect(selectLobbySetup(buildInput(practiceDeck, { roomState: null }))).toMatchObject({
      hostName: null,
      roomCode: null,
    });
    expect(selectLobbySetup(buildInput())).toMatchObject({
      hostName: "Player One",
      roomCode: "TEST_ROOM_1",
    });
  });
});

describe("selectDeckMeter", () => {
  it("needs target − 1 cards per player plus one, for 1–8 players and every target", () => {
    for (let playerCount = 1; playerCount <= 8; playerCount += 1) {
      for (
        let target = MIN_TARGET_TIMELINE_CARD_COUNT;
        target <= MAX_TARGET_TIMELINE_CARD_COUNT;
        target += 1
      ) {
        const required = playerCount * (target - 1) + 1;
        const settings = buildRoomSettings({
          importedTrackCount: required,
          targetTimelineCardCount: target,
        });
        const meter = selectDeckMeter(players(playerCount), settings);

        expect(meter).toEqual({
          current: required,
          isEnough: true,
          playerCount,
          required,
          target,
        });
        expect(
          selectDeckMeter(players(playerCount), { ...settings, importedTrackCount: required - 1 })
            .isEnough,
        ).toBe(false);
      }
    }
  });

  it("counts a player's larger starting hand instead of the target", () => {
    const settings = buildRoomSettings({ targetTimelineCardCount: 3 });
    const meter = selectDeckMeter(
      [buildPlayer({ startingTimelineCardCount: 5 }), buildPlayer({ id: "player-2" })],
      settings,
    );

    expect(meter.required).toBe(5 + 2 + 1);
  });

  it("recommends half as many songs again as required, rounded up to ten, at least 40", () => {
    const twoPlayers = selectLobbySetup(buildInput());
    const eightPlayers = selectLobbySetup(
      buildInput(practiceDeck, {
        roomState: buildLobbyRoomState({ players: players(8) }),
      }),
    );

    // Two players to the default 10: 9 + 9 + 1 = 19 required, 28.5 → 30, raised to 40.
    expect(twoPlayers.recommendedDeckSize).toBe(40);
    // Eight players: 8 × 9 + 1 = 73 required, 109.5 → 110.
    expect(eightPlayers.recommendedDeckSize).toBe(110);
  });
});

describe("selectRulesSummary", () => {
  it("reads default rules until any rule changes", () => {
    expect(selectRulesSummary(buildRoomSettings())).toEqual({
      isCustom: false,
      starting: 1,
      target: 10,
      tokens: { seconds: 10 },
    });
    expect(selectRulesSummary(buildRoomSettings({ targetTimelineCardCount: 12 })).isCustom).toBe(
      true,
    );
  });

  it("carries the Beat! window when tokens are on, including no time limit", () => {
    expect(
      selectRulesSummary(
        buildRoomSettings({ challengeWindowDurationSeconds: 15, ttModeEnabled: true }),
      ).tokens,
    ).toEqual({ seconds: 15 });
    expect(
      selectRulesSummary(
        buildRoomSettings({ challengeWindowDurationSeconds: null, ttModeEnabled: true }),
      ).tokens,
    ).toEqual({ seconds: null });
  });
});

describe("selectPlayersStrip", () => {
  it("shows up to four players and folds the rest into a count", () => {
    expect(selectPlayersStrip(players(4))).toMatchObject({ hiddenCount: 0, total: 4 });
    const crowded = selectPlayersStrip(players(6));

    expect(crowded.shown.map((player) => player.displayName)).toEqual([
      "Player 1",
      "Player 2",
      "Player 3",
    ]);
    expect(crowded).toMatchObject({ hiddenCount: 3, total: 6 });
  });
});
