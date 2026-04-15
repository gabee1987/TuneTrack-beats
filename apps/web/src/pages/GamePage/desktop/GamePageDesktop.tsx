import { GamePageActionPanels } from "../components/GamePageActionPanels";
import { GamePageHeader } from "../components/GamePageHeader";
import { TimelinePanel } from "../components/TimelinePanel";
import type { GamePageAssemblyProps } from "../GamePage.types";
import styles from "./GamePageDesktop.module.css";

export function GamePageDesktop({ controller }: GamePageAssemblyProps) {
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

        <div className={styles.layoutGrid}>
          <section className={styles.mainColumn}>
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
              onSelectSlot={controller.setSelectedSlotIndex}
              onToggleTimelineView={controller.setTimelineView}
              originalChosenSlotIndex={controller.visibleOriginalChosenSlot}
              previewCard={controller.visiblePreviewCard}
              previewSlotIndex={controller.visiblePreviewSlot}
              selectable={!controller.isViewingOwnTimeline && controller.canSelectSlot}
              selectedSlotIndex={controller.selectedSlotIndex}
              showCorrectPlacementPreview={controller.showCorrectPlacementPreview}
              showCorrectionPreview={controller.showCorrectionPreview}
              showDevAlbumInfo={controller.isHost && controller.showDevAlbumInfo}
              showDevCardInfo={controller.isHost && controller.showDevCardInfo}
              showDevGenreInfo={controller.isHost && controller.showDevGenreInfo}
              showDevYearInfo={controller.isHost && controller.showDevYearInfo}
              showHint={controller.showTimelineHints}
              theme={controller.theme}
              timelineCards={controller.visibleTimelineCards}
              timelineView={controller.timelineView}
              title={controller.visibleTimelineTitle}
            />
          </section>

          <aside className={styles.sidebarColumn}>
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
          </aside>
        </div>
      </section>
    </main>
  );
}
