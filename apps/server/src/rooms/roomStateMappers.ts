import {
  type GameState,
  type GameTrackCard,
  type RevealState,
  type TimelineCard,
} from "@tunetrack/game-engine";
import {
  type PublicGameHistoryEntry,
  type PublicChallengeState,
  type PublicRevealState,
  type PublicRoomState,
  type TimelineCardPublic,
  type TrackCardPublic,
} from "@tunetrack/shared";

export function mapGameStateToPublicRoomState(
  currentRoomState: PublicRoomState,
  gameState: GameState,
  trackCardsById: Map<string, GameTrackCard>,
): PublicRoomState {
  return {
    ...currentRoomState,
    status: gameState.phase,
    players: currentRoomState.players.map((player) => {
      const nextPlayer = gameState.players.find(
        (gamePlayer) => gamePlayer.id === player.id,
      );

      return nextPlayer
        ? {
            ...player,
            ttTokenCount: nextPlayer.ttTokenCount,
          }
        : player;
    }),
    timelines: Object.fromEntries(
      Object.entries(gameState.timelines).map(([playerId, timelineCards]) => [
        playerId,
        timelineCards.map((timelineCard) =>
          mapTimelineCardToPublicTimelineCard(timelineCard, trackCardsById),
        ),
      ]),
    ),
    currentTrackCard: gameState.currentTrackCard
      ? mapTrackCardToPublicTrackCard(gameState.currentTrackCard)
      : null,
    turn: gameState.turn
      ? {
          activePlayerId: gameState.turn.activePlayerId,
          turnNumber: gameState.turn.turnNumber,
          hasUsedSkipTrackWithTt: gameState.turn.hasUsedSkipTrackWithTt,
          turnSkipDeadlineEpochMs: null,
        }
      : null,
    challengeState: gameState.challengeState
      ? mapChallengeStateToPublicChallengeState(gameState.challengeState)
      : null,
    revealState: gameState.revealState
      ? mapRevealStateToPublicRevealState(gameState.revealState, trackCardsById)
      : null,
    history: gameState.history.map((entry) =>
      mapRevealStateToPublicGameHistoryEntry(entry, trackCardsById),
    ),
    winnerPlayerId: gameState.winnerPlayerId,
  };
}

export function createTrackCardMap(
  deckCards: GameTrackCard[],
): Map<string, GameTrackCard> {
  return new Map(deckCards.map((card) => [card.id, { ...card }]));
}

function mapChallengeStateToPublicChallengeState(
  challengeState: GameState["challengeState"],
): PublicChallengeState | null {
  if (!challengeState) return null;

  return {
    phase: challengeState.phase,
    originalPlayerId: challengeState.originalPlayerId,
    originalSelectedSlotIndex: challengeState.originalSelectedSlotIndex,
    challengerPlayerId: challengeState.challengerPlayerId,
    challengeDeadlineEpochMs: challengeState.challengeDeadlineEpochMs,
    challengerSelectedSlotIndex: challengeState.challengerSelectedSlotIndex,
  };
}

function mapRevealStateToPublicRevealState(
  revealState: GameState["revealState"],
  trackCardsById: Map<string, GameTrackCard>,
): PublicRevealState | null {
  if (!revealState) return null;

  return {
    playerId: revealState.playerId,
    placedCard: mapTimelineCardToPublicTimelineCard(
      revealState.placedCard,
      trackCardsById,
    ),
    selectedSlotIndex: revealState.selectedSlotIndex,
    wasCorrect: revealState.wasCorrect,
    revealType: revealState.revealType,
    validSlotIndexes: revealState.validSlotIndexes,
    challengerPlayerId: revealState.challengerPlayerId,
    challengerSelectedSlotIndex: revealState.challengerSelectedSlotIndex,
    challengeWasSuccessful: revealState.challengeWasSuccessful,
    challengerTtChange: revealState.challengerTtChange,
    awardedPlayerId: revealState.awardedPlayerId,
    awardedSlotIndex: revealState.awardedSlotIndex,
  };
}

function mapRevealStateToPublicGameHistoryEntry(
  revealState: RevealState,
  trackCardsById: Map<string, GameTrackCard>,
): PublicGameHistoryEntry {
  return {
    playerId: revealState.playerId,
    placedCard: mapTimelineCardToPublicTimelineCard(
      revealState.placedCard,
      trackCardsById,
    ),
    selectedSlotIndex: revealState.selectedSlotIndex,
    wasCorrect: revealState.wasCorrect,
    revealType: revealState.revealType,
    challengeWasSuccessful: revealState.challengeWasSuccessful,
    challengerPlayerId: revealState.challengerPlayerId,
    challengerSelectedSlotIndex: revealState.challengerSelectedSlotIndex,
    awardedPlayerId: revealState.awardedPlayerId,
    awardedSlotIndex: revealState.awardedSlotIndex,
  };
}

function mapTimelineCardToPublicTimelineCard(
  timelineCard: TimelineCard,
  trackCardsById: Map<string, GameTrackCard>,
): TimelineCardPublic {
  const trackCard = trackCardsById.get(timelineCard.id);
  if (!trackCard) throw new Error("TRACK_CARD_NOT_FOUND");

  return {
    ...mapTrackCardToPublicTrackCard(trackCard),
    revealedYear: timelineCard.releaseYear,
  };
}

function mapTrackCardToPublicTrackCard(trackCard: GameTrackCard): TrackCardPublic {
  return {
    id: trackCard.id,
    title: trackCard.title,
    artist: trackCard.artist,
    albumTitle: trackCard.albumTitle,
    releaseYear: trackCard.releaseYear,
    ...(trackCard.genre ? { genre: trackCard.genre } : {}),
    ...(trackCard.artworkUrl ? { artworkUrl: trackCard.artworkUrl } : {}),
    ...(trackCard.previewUrl ? { previewUrl: trackCard.previewUrl } : {}),
    ...(trackCard.spotifyTrackUri ? { spotifyTrackUri: trackCard.spotifyTrackUri } : {}),
  };
}

