import { describe, expect, it } from "vitest";
import {
  buildPlayer,
  buildRoomSettings,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
} from "../../test/roomStateFixtures";
import {
  getGuestHandoverMessage,
  getHostPlaybackNotice,
  isViewerNextToPlay,
} from "./handoverNotices";

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key} ${JSON.stringify(params)}` : key;

const spotifySettings = buildRoomSettings({
  deckSource: "spotify",
  spotifyAuthStatus: "connected",
  spotifyPlaybackOwnerPlayerId: TEST_HOST_ID,
});

function withTurn(turnNumber: number, activePlayerId = TEST_HOST_ID) {
  return {
    activePlayerId,
    hasUsedSkipTrackWithTt: false,
    turnNumber,
    turnSkipDeadlineEpochMs: null,
  };
}

describe("getGuestHandoverMessage", () => {
  it("tells a guest on the first turn whose phone plays the music", () => {
    const roomState = buildTurnRoomState({ settings: spotifySettings });

    expect(getGuestHandoverMessage(roomState, TEST_GUEST_ID, t)).toBe(
      'game.handover.guest {"host":"Player One"}',
    );
  });

  it("says the round is silent with the practice deck", () => {
    const roomState = buildTurnRoomState({
      settings: buildRoomSettings({ deckSource: "practice" }),
    });

    expect(getGuestHandoverMessage(roomState, TEST_GUEST_ID, t)).toBe("game.handover.guestNoAudio");
  });

  it("says nothing to the host, after the first turn or before anyone is known", () => {
    const roomState = buildTurnRoomState({ settings: spotifySettings });

    expect(getGuestHandoverMessage(roomState, TEST_HOST_ID, t)).toBeNull();
    expect(
      getGuestHandoverMessage({ ...roomState, turn: withTurn(2) }, TEST_GUEST_ID, t),
    ).toBeNull();
    expect(getGuestHandoverMessage(roomState, null, t)).toBeNull();
  });
});

describe("getHostPlaybackNotice", () => {
  it("shows playback to the player whose phone owns it, and to nobody else", () => {
    const roomState = buildTurnRoomState({ settings: spotifySettings });

    expect(getHostPlaybackNotice(roomState, TEST_HOST_ID)).toBe("owner");
    expect(getHostPlaybackNotice(roomState, TEST_GUEST_ID)).toBeNull();
  });

  it("notes the practice deck to the host on the first turn only", () => {
    const roomState = buildTurnRoomState({
      settings: buildRoomSettings({ deckSource: "practice" }),
    });

    expect(getHostPlaybackNotice(roomState, TEST_HOST_ID)).toBe("practice");
    expect(getHostPlaybackNotice(roomState, TEST_GUEST_ID)).toBeNull();
    expect(getHostPlaybackNotice({ ...roomState, turn: withTurn(2) }, TEST_HOST_ID)).toBeNull();
  });
});

describe("isViewerNextToPlay", () => {
  const threePlayers = buildTurnRoomState({
    players: [
      buildPlayer(),
      buildPlayer({ id: TEST_GUEST_ID, displayName: "Player Two", isHost: false }),
      buildPlayer({ id: "player-three", displayName: "Player Three", isHost: false }),
    ],
  });

  it("is true only for the player after the active one, wrapping round", () => {
    expect(isViewerNextToPlay(threePlayers, TEST_GUEST_ID)).toBe(true);
    expect(isViewerNextToPlay(threePlayers, "player-three")).toBe(false);
    expect(
      isViewerNextToPlay({ ...threePlayers, turn: withTurn(4, "player-three") }, TEST_HOST_ID),
    ).toBe(true);
  });

  it("is false for the active player and outside a turn", () => {
    expect(isViewerNextToPlay(threePlayers, TEST_HOST_ID)).toBe(false);
    expect(isViewerNextToPlay({ ...threePlayers, status: "reveal" }, TEST_GUEST_ID)).toBe(false);
  });
});
