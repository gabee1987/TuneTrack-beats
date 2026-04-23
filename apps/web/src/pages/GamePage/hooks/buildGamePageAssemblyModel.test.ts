import { describe, expect, it } from "vitest";
import type { LoadedGamePageController } from "../GamePage.types";
import { buildGamePageAssemblyModel } from "./buildGamePageAssemblyModel";

describe("buildGamePageAssemblyModel", () => {
  it("groups controller state into header, timeline, and action models", () => {
    const controller = {
      canChangeTimelineView: true,
      canClaimChallenge: true,
      canConfirmBeatPlacement: false,
      canConfirmReveal: true,
      canConfirmTurnPlacement: true,
      canResolveChallengeWindow: false,
      canSelectSlot: true,
      canToggleTimelineView: true,
      canUseBuyCard: true,
      canUseSkipTrack: false,
      challengeActionBody: "Place the challenge card",
      challengeActionTitle: "Beat move",
      challengeCountdownLabel: "12s left",
      challengeMarkerTone: "success",
      challengeSuccessCelebrationCard: null,
      challengeSuccessCelebrationKey: "celebration-key",
      challengeSuccessMessage: "Beat confirmed",
      currentPlayerId: "player-1",
      currentPlayerTtCount: 2,
      disabledTimelineSlots: [1, 3],
      errorMessage: "Room sync issue",
      getPlayerName: (playerId: string | null | undefined) =>
        playerId === "player-1" ? "You" : "Other",
      handleBuyTimelineCardWithTt: () => undefined,
      handleClaimChallenge: () => undefined,
      handleCloseRoom: () => undefined,
      handleConfirmReveal: () => undefined,
      handlePlaceCard: () => undefined,
      handlePlaceChallenge: () => undefined,
      handleResolveChallengeWindow: () => undefined,
      handleSkipTrackWithTt: () => undefined,
      hiddenCardMode: "hidden",
      isHost: true,
      isViewingOwnTimeline: false,
      leadingPlayers: [],
      menuTabs: [],
      roomState: {
        players: [],
        roomId: "ABCD",
        settings: { ttModeEnabled: true },
        status: "playing",
        timelines: {},
        turn: { turnNumber: 4 },
      },
      selectedSlotIndex: 2,
      setSelectedSlotIndex: () => undefined,
      setTimelineView: () => undefined,
      showCorrectPlacementPreview: true,
      showCorrectionPreview: false,
      showDevAlbumInfo: true,
      showDevCardInfo: true,
      showDevGenreInfo: false,
      showDevYearInfo: true,
      showHelperLabels: true,
      showMiniStandings: true,
      showPhaseChip: true,
      showRoomCodeChip: true,
      showTimelineHints: true,
      showTurnNumberChip: true,
      statusBadgeText: "Your turn",
      statusDetailText: "Choose a slot",
      theme: "classic",
      timelineView: "active",
      updateViewPreferences: () => undefined,
      visibleChallengeChosenSlot: 4,
      visibleOriginalChosenSlot: 1,
      visiblePreviewCard: null,
      visiblePreviewSlot: 5,
      visibleTimelineCardCount: 6,
      visibleTimelineCards: [],
      visibleTimelineHint: "Place the current track",
      visibleTimelineTtCount: 3,
      visibleTimelineTitle: "Active timeline",
    } as unknown as LoadedGamePageController;

    const model = buildGamePageAssemblyModel(controller);

    expect(model.errorMessage).toBe("Room sync issue");
    expect(model.header.roomState.roomId).toBe("ABCD");
    expect(model.header.statusBadgeText).toBe("Your turn");
    expect(model.header.visibleTimelineTtCount).toBe(3);
    expect(model.timeline.interaction.selectable).toBe(true);
    expect(model.timeline.render.showDevCardInfo).toBe(true);
    expect(model.timeline.render.showDevGenreInfo).toBe(false);
    expect(model.timeline.interaction.disabledSlotIndexes).toEqual([1, 3]);
    expect(model.actions.challengeActionTitle).toBe("Beat move");
    expect(model.actions.roomState).toBe(controller.roomState);
  });
});
