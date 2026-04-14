import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GamePageActionPanels } from "./components/GamePageActionPanels";
import { GamePageHeader } from "./components/GamePageHeader";
import { TimelinePanel } from "./components/TimelinePanel";
import type { GameRouteState } from "./GamePage.types";
import { useGamePageController } from "./hooks/useGamePageController";
import styles from "./GamePage.module.css";

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as Partial<GameRouteState>;
  const controller = useGamePageController({
    navigate,
    roomId,
    routeState,
  });

  if (!controller.roomState) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Loading game...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <GamePageHeader
          currentPlayerId={controller.currentPlayerId}
          leadingPlayers={controller.leadingPlayers}
          menuTabs={controller.menuTabs}
          roomState={controller.roomState}
          showMiniStandings={controller.showMiniStandings}
          showPhaseChip={controller.showPhaseChip}
          showRoomCodeChip={controller.showRoomCodeChip}
          showTimelineHints={controller.showTimelineHints}
          showTurnNumberChip={controller.showTurnNumberChip}
          statusBadgeText={controller.statusBadgeText}
          statusDetailText={controller.statusDetailText}
          updateViewPreferences={controller.updateViewPreferences}
        />

        {controller.errorMessage ? (
          <p className={styles.error}>{controller.errorMessage}</p>
        ) : null}

        <TimelinePanel
          celebrationCard={controller.challengeSuccessCelebrationCard}
          celebrationKey={controller.challengeSuccessCelebrationKey}
          celebrationMessage={controller.challengeSuccessMessage}
          canChangeTimelineView={controller.canChangeTimelineView}
          cardCount={controller.visibleTimelineCardCount}
          canToggleView={controller.canToggleTimelineView}
          challengeMarkerTone={controller.challengeMarkerTone}
          challengerChosenSlotIndex={controller.visibleChallengeChosenSlot}
          disabledSlotIndexes={controller.disabledTimelineSlots}
          hiddenCardMode={controller.hiddenCardMode}
          hint={controller.visibleTimelineHint}
          onToggleTimelineView={controller.setTimelineView}
          onSelectSlot={controller.setSelectedSlotIndex}
          originalChosenSlotIndex={controller.visibleOriginalChosenSlot}
          previewCard={controller.visiblePreviewCard}
          previewSlotIndex={controller.visiblePreviewSlot}
          selectable={!controller.isViewingOwnTimeline && controller.canSelectSlot}
          selectedSlotIndex={controller.selectedSlotIndex}
          showDevAlbumInfo={controller.isHost && controller.showDevAlbumInfo}
          showDevCardInfo={controller.isHost && controller.showDevCardInfo}
          showDevYearInfo={controller.isHost && controller.showDevYearInfo}
          showDevGenreInfo={controller.isHost && controller.showDevGenreInfo}
          showCorrectPlacementPreview={controller.showCorrectPlacementPreview}
          showCorrectionPreview={controller.showCorrectionPreview}
          showHint={controller.showTimelineHints}
          theme={controller.theme}
          timelineCards={controller.visibleTimelineCards}
          timelineView={controller.timelineView}
          title={controller.visibleTimelineTitle}
        />

        <GamePageActionPanels
          canClaimChallenge={controller.canClaimChallenge}
          canConfirmBeatPlacement={controller.canConfirmBeatPlacement}
          canConfirmReveal={controller.canConfirmReveal}
          canConfirmTurnPlacement={controller.canConfirmTurnPlacement}
          canResolveChallengeWindow={controller.canResolveChallengeWindow}
          canUseBuyCard={controller.canUseBuyCard}
          canUseSkipTrack={controller.canUseSkipTrack}
          challengeActionBody={controller.challengeActionBody}
          challengeActionTitle={controller.challengeActionTitle}
          challengeCountdownLabel={controller.challengeCountdownLabel}
          currentPlayerTtCount={controller.currentPlayerTtCount}
          getPlayerName={controller.getPlayerName}
          handleBuyTimelineCardWithTt={controller.handleBuyTimelineCardWithTt}
          handleClaimChallenge={controller.handleClaimChallenge}
          handleConfirmReveal={controller.handleConfirmReveal}
          handlePlaceCard={controller.handlePlaceCard}
          handlePlaceChallenge={controller.handlePlaceChallenge}
          handleResolveChallengeWindow={controller.handleResolveChallengeWindow}
          handleSkipTrackWithTt={controller.handleSkipTrackWithTt}
          roomState={controller.roomState}
          showHelperLabels={controller.showHelperLabels}
        />
      </section>
    </main>
  );
}
