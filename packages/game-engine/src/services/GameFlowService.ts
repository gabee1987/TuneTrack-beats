import type { ChallengeState } from "../domain/ChallengeState.js";
import type { GamePlayer } from "../domain/GamePlayer.js";
import type { GameState } from "../domain/GameState.js";
import type { GameTrackCard } from "../domain/GameTrackCard.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";

const MAX_TT_TOKEN_COUNT = 5;

export interface StartGamePlayerInput {
  id: string;
  displayName: string;
  startingTimelineCardCount: number;
  startingTtTokenCount: number;
}

export interface StartGameInput {
  players: StartGamePlayerInput[];
  deck: GameTrackCard[];
  targetTimelineCardCount: number;
}

export interface PlaceCardOptions {
  challengeEnabled?: boolean;
  challengeDeadlineEpochMs?: number | null;
}

export class GameFlowService {
  public startGame(startGameInput: StartGameInput): GameState {
    validateStartGameInput(startGameInput);

    const firstPlayer = startGameInput.players[0];

    if (!firstPlayer) {
      throw new Error("NOT_ENOUGH_PLAYERS");
    }

    const deck = [...startGameInput.deck];
    const timelines: Record<string, TimelineCard[]> = {};

    for (const player of startGameInput.players) {
      timelines[player.id] = drawStartingTimelineCards(
        deck,
        player.startingTimelineCardCount,
      );
    }

    return {
      phase: "turn",
      players: startGameInput.players.map((player) => ({
        ...player,
        ttTokenCount: player.startingTtTokenCount,
      })),
      timelines,
      deck,
      currentTrackCard: drawNextCard(deck),
      turn: {
        activePlayerId: firstPlayer.id,
        turnNumber: 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
      winnerPlayerId: null,
      targetTimelineCardCount: startGameInput.targetTimelineCardCount,
    };
  }

  public placeCard(
    gameState: GameState,
    playerId: string,
    selectedSlotIndex: number,
    placeCardOptions: PlaceCardOptions = {},
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new Error("NOT_ACTIVE_PLAYER");
    }

    if (!gameState.currentTrackCard) {
      throw new Error("CURRENT_CARD_NOT_AVAILABLE");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    if (!Number.isInteger(selectedSlotIndex) || selectedSlotIndex < 0) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex > playerTimeline.length) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    const placementResult = evaluateTimelinePlacement(
      playerTimeline,
      gameState.currentTrackCard.releaseYear,
      selectedSlotIndex,
    );
    const placedCard: TimelineCard = {
      id: gameState.currentTrackCard.id,
      releaseYear: gameState.currentTrackCard.releaseYear,
    };

    if (placeCardOptions.challengeEnabled) {
      const challengeState: ChallengeState = {
        phase: "open",
        originalPlayerId: playerId,
        originalSelectedSlotIndex: selectedSlotIndex,
        placedCard,
        originalWasCorrect: placementResult.isCorrect,
        originalValidSlotIndexes: placementResult.validSlotIndexes,
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        challengeDeadlineEpochMs:
          placeCardOptions.challengeDeadlineEpochMs ?? null,
      };

      return {
        ...gameState,
        phase: "challenge",
        challengeState,
        revealState: null,
      };
    }

    const nextTimeline = placementResult.isCorrect
      ? insertTimelineCard(playerTimeline, selectedSlotIndex, placedCard)
      : [...playerTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [playerId]: nextTimeline,
    };
    const revealState: RevealState = {
      playerId,
      placedCard,
      selectedSlotIndex,
      wasCorrect: placementResult.isCorrect,
      revealType: "placement",
      validSlotIndexes: placementResult.validSlotIndexes,
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: placementResult.isCorrect ? playerId : null,
      awardedSlotIndex: placementResult.isCorrect ? selectedSlotIndex : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      winnerPlayerId:
        placementResult.isCorrect &&
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? playerId
          : null,
    };
  }

  public claimChallenge(gameState: GameState, challengerPlayerId: string): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState || !gameState.turn) {
      throw new Error("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (gameState.turn.activePlayerId === challengerPlayerId) {
      throw new Error("ACTIVE_PLAYER_CANNOT_CHALLENGE");
    }

    if (gameState.challengeState.challengerPlayerId) {
      throw new Error("CHALLENGE_ALREADY_CLAIMED");
    }

    const challenger = gameState.players.find(
      (player) => player.id === challengerPlayerId,
    );

    if (!challenger) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    if (challenger.ttTokenCount < 1) {
      throw new Error("INSUFFICIENT_TT");
    }

    return {
      ...gameState,
      challengeState: {
        ...gameState.challengeState,
        phase: "claimed",
        challengerPlayerId,
      },
    };
  }

  public placeChallengeCard(
    gameState: GameState,
    challengerPlayerId: string,
    selectedSlotIndex: number,
  ): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState || !gameState.turn) {
      throw new Error("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (gameState.challengeState.challengerPlayerId !== challengerPlayerId) {
      throw new Error("ONLY_CHALLENGE_OWNER_CAN_PLACE");
    }

    const originalPlayerId = gameState.challengeState.originalPlayerId;
    const originalTimeline = gameState.timelines[originalPlayerId];

    if (!originalTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    if (!Number.isInteger(selectedSlotIndex) || selectedSlotIndex < 0) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex > originalTimeline.length) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    if (
      selectedSlotIndex === gameState.challengeState.originalSelectedSlotIndex
    ) {
      throw new Error("CHALLENGE_SLOT_MUST_DIFFER");
    }

    const challengerPlacement = evaluateTimelinePlacement(
      originalTimeline,
      gameState.challengeState.placedCard.releaseYear,
      selectedSlotIndex,
    );
    const challengeWasSuccessful =
      !gameState.challengeState.originalWasCorrect && challengerPlacement.isCorrect;
    const challengerTtChange = challengeWasSuccessful ? 1 : -1;
    const nextPlayers = updatePlayerTokenCount(
      gameState.players,
      challengerPlayerId,
      challengerTtChange,
    );
    const challengerTimeline = gameState.timelines[challengerPlayerId];

    if (!challengerTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    const challengerAwardSlotIndex = challengeWasSuccessful
      ? findFirstValidSlotIndex(
          challengerTimeline,
          gameState.challengeState.placedCard.releaseYear,
        )
      : null;
    const nextOriginalTimeline =
      gameState.challengeState.originalWasCorrect
        ? insertTimelineCard(
            originalTimeline,
            gameState.challengeState.originalSelectedSlotIndex,
            gameState.challengeState.placedCard,
          )
        : [...originalTimeline];
    const nextChallengerTimeline =
      challengeWasSuccessful && challengerAwardSlotIndex !== null
        ? insertTimelineCard(
            challengerTimeline,
            challengerAwardSlotIndex,
            gameState.challengeState.placedCard,
          )
        : [...challengerTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [originalPlayerId]: nextOriginalTimeline,
      [challengerPlayerId]: nextChallengerTimeline,
    };
    const revealState: RevealState = {
      playerId: originalPlayerId,
      placedCard: gameState.challengeState.placedCard,
      selectedSlotIndex: gameState.challengeState.originalSelectedSlotIndex,
      wasCorrect: gameState.challengeState.originalWasCorrect,
      revealType: "placement",
      validSlotIndexes: gameState.challengeState.originalValidSlotIndexes,
      challengerPlayerId,
      challengerSelectedSlotIndex: selectedSlotIndex,
      challengeWasSuccessful,
      challengerTtChange,
      awardedPlayerId: challengeWasSuccessful
        ? challengerPlayerId
        : gameState.challengeState.originalWasCorrect
          ? originalPlayerId
          : null,
      awardedSlotIndex: challengeWasSuccessful
        ? challengerAwardSlotIndex
        : gameState.challengeState.originalWasCorrect
          ? gameState.challengeState.originalSelectedSlotIndex
          : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      players: nextPlayers,
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      winnerPlayerId:
        challengeWasSuccessful &&
        nextChallengerTimeline.length >= gameState.targetTimelineCardCount
          ? challengerPlayerId
          : gameState.challengeState.originalWasCorrect &&
              nextOriginalTimeline.length >= gameState.targetTimelineCardCount
            ? originalPlayerId
            : null,
    };
  }

  public resolveChallengeWindow(gameState: GameState): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState) {
      throw new Error("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (gameState.challengeState.challengerPlayerId) {
      throw new Error("CHALLENGE_ALREADY_CLAIMED");
    }

    const originalPlayerId = gameState.challengeState.originalPlayerId;
    const originalTimeline = gameState.timelines[originalPlayerId];

    if (!originalTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    const nextTimeline = gameState.challengeState.originalWasCorrect
      ? insertTimelineCard(
          originalTimeline,
          gameState.challengeState.originalSelectedSlotIndex,
          gameState.challengeState.placedCard,
        )
      : [...originalTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [originalPlayerId]: nextTimeline,
    };
    const revealState: RevealState = {
      playerId: originalPlayerId,
      placedCard: gameState.challengeState.placedCard,
      selectedSlotIndex: gameState.challengeState.originalSelectedSlotIndex,
      wasCorrect: gameState.challengeState.originalWasCorrect,
      revealType: "placement",
      validSlotIndexes: gameState.challengeState.originalValidSlotIndexes,
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: gameState.challengeState.originalWasCorrect
        ? originalPlayerId
        : null,
      awardedSlotIndex: gameState.challengeState.originalWasCorrect
        ? gameState.challengeState.originalSelectedSlotIndex
        : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      winnerPlayerId:
        gameState.challengeState.originalWasCorrect &&
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? originalPlayerId
          : null,
    };
  }

  public confirmReveal(gameState: GameState): GameState {
    if (gameState.phase !== "reveal" || !gameState.turn || !gameState.revealState) {
      throw new Error("GAME_NOT_IN_REVEAL_PHASE");
    }

    if (gameState.winnerPlayerId) {
      return {
        ...gameState,
        phase: "finished",
        currentTrackCard: null,
        turn: null,
        revealState: null,
      };
    }

    return {
      ...gameState,
      phase: "turn",
      currentTrackCard: drawNextCard(gameState.deck),
      turn: {
        activePlayerId: findNextActivePlayerId(
          gameState.players,
          gameState.turn.activePlayerId,
        ),
        turnNumber: gameState.turn.turnNumber + 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public advanceTurnToPlayer(
    gameState: GameState,
    nextActivePlayerId: string,
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (!gameState.players.some((player) => player.id === nextActivePlayerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    if (gameState.turn.activePlayerId === nextActivePlayerId) {
      throw new Error("ACTIVE_PLAYER_UNCHANGED");
    }

    return {
      ...gameState,
      turn: {
        activePlayerId: nextActivePlayerId,
        turnNumber: gameState.turn.turnNumber + 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public awardTtTokens(
    gameState: GameState,
    playerId: string,
    tokenAmount: number,
  ): GameState {
    if (!Number.isInteger(tokenAmount) || tokenAmount === 0) {
      throw new Error("INVALID_TT_AMOUNT");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, tokenAmount),
    };
  }

  public skipCurrentTrackWithTt(
    gameState: GameState,
    playerId: string,
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new Error("NOT_ACTIVE_PLAYER");
    }

    if (!gameState.currentTrackCard) {
      throw new Error("CURRENT_CARD_NOT_AVAILABLE");
    }

    assertPlayerHasEnoughTt(gameState.players, playerId, 1);

    if (gameState.turn.hasUsedSkipTrackWithTt) {
      throw new Error("SKIP_ALREADY_USED_THIS_TURN");
    }

    const nextTrackCard = drawNextCard(gameState.deck);

    if (!nextTrackCard) {
      throw new Error("NOT_ENOUGH_CARDS");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, -1),
      currentTrackCard: nextTrackCard,
      turn: {
        ...gameState.turn,
        hasUsedSkipTrackWithTt: true,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public buyTimelineCardWithTt(
    gameState: GameState,
    playerId: string,
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new Error("NOT_ACTIVE_PLAYER");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    assertPlayerHasEnoughTt(gameState.players, playerId, 3);

    const boughtTrackCard = gameState.currentTrackCard;

    if (!boughtTrackCard) {
      throw new Error("CURRENT_CARD_NOT_AVAILABLE");
    }

    const awardedSlotIndex = findFirstValidSlotIndex(
      playerTimeline,
      boughtTrackCard.releaseYear,
    );
    const boughtTimelineCard: TimelineCard = {
      id: boughtTrackCard.id,
      releaseYear: boughtTrackCard.releaseYear,
    };
    const nextTimeline = insertTimelineCard(
      playerTimeline,
      awardedSlotIndex,
      boughtTimelineCard,
    );
    const revealState: RevealState = {
      playerId,
      placedCard: boughtTimelineCard,
      selectedSlotIndex: awardedSlotIndex,
      wasCorrect: true,
      revealType: "tt_buy",
      validSlotIndexes: [awardedSlotIndex],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: playerId,
      awardedSlotIndex,
    };

    return {
      ...gameState,
      phase: "reveal",
      players: updatePlayerTokenCount(gameState.players, playerId, -3),
      timelines: {
        ...gameState.timelines,
        [playerId]: nextTimeline,
      },
      currentTrackCard: gameState.currentTrackCard,
      turn: gameState.turn,
      challengeState: null,
      revealState,
      winnerPlayerId:
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? playerId
          : null,
    };
  }
}

function findFirstValidSlotIndex(
  timelineCards: TimelineCard[],
  releaseYear: number,
): number {
  for (let selectedSlotIndex = 0; selectedSlotIndex <= timelineCards.length; selectedSlotIndex += 1) {
    const placementResult = evaluateTimelinePlacement(
      timelineCards,
      releaseYear,
      selectedSlotIndex,
    );

    if (placementResult.isCorrect) {
      return selectedSlotIndex;
    }
  }

  throw new Error("VALID_SLOT_NOT_FOUND");
}

function validateStartGameInput(startGameInput: StartGameInput): void {
  if (startGameInput.players.length < 1) {
    throw new Error("NOT_ENOUGH_PLAYERS");
  }

  const totalStartingCardCount = startGameInput.players.reduce(
    (sum, player) => sum + player.startingTimelineCardCount,
    0,
  );
  const minimumRequiredDeckSize = totalStartingCardCount + 1;

  if (startGameInput.deck.length < minimumRequiredDeckSize) {
    throw new Error("NOT_ENOUGH_CARDS");
  }

  if (
    !Number.isInteger(startGameInput.targetTimelineCardCount) ||
    startGameInput.targetTimelineCardCount < 1
  ) {
    throw new Error("INVALID_TARGET_TIMELINE_CARD_COUNT");
  }
}

function drawStartingTimelineCards(
  deck: GameTrackCard[],
  startingTimelineCardCount: number,
): TimelineCard[] {
  const timelineCards: TimelineCard[] = [];

  for (let index = 0; index < startingTimelineCardCount; index += 1) {
    const card = drawNextCard(deck);

    if (!card) {
      throw new Error("NOT_ENOUGH_CARDS");
    }

    timelineCards.push({
      id: card.id,
      releaseYear: card.releaseYear,
    });
  }

  return [...timelineCards].sort(
    (leftCard, rightCard) => leftCard.releaseYear - rightCard.releaseYear,
  );
}

function drawNextCard(deck: GameTrackCard[]): GameTrackCard | null {
  return deck.shift() ?? null;
}

function insertTimelineCard(
  timelineCards: TimelineCard[],
  selectedSlotIndex: number,
  placedCard: TimelineCard,
): TimelineCard[] {
  return [
    ...timelineCards.slice(0, selectedSlotIndex),
    placedCard,
    ...timelineCards.slice(selectedSlotIndex),
  ];
}

function findNextActivePlayerId(
  players: GamePlayer[],
  currentActivePlayerId: string,
): string {
  const currentPlayerIndex = players.findIndex(
    (player) => player.id === currentActivePlayerId,
  );

  if (currentPlayerIndex === -1) {
    throw new Error("ACTIVE_PLAYER_NOT_FOUND");
  }

  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  if (!nextPlayer) {
    throw new Error("ACTIVE_PLAYER_NOT_FOUND");
  }

  return nextPlayer.id;
}

function updatePlayerTokenCount(
  players: GamePlayer[],
  playerId: string,
  tokenDelta: number,
): GamePlayer[] {
  let hasMatchingPlayer = false;

  const nextPlayers = players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    hasMatchingPlayer = true;

    return {
      ...player,
      ttTokenCount: Math.min(MAX_TT_TOKEN_COUNT, Math.max(0, player.ttTokenCount + tokenDelta)),
    };
  });

  if (!hasMatchingPlayer) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  return nextPlayers;
}

function assertPlayerHasEnoughTt(
  players: GamePlayer[],
  playerId: string,
  requiredTokenCount: number,
): void {
  const player = players.find((candidatePlayer) => candidatePlayer.id === playerId);

  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  if (player.ttTokenCount < requiredTokenCount) {
    throw new Error("INSUFFICIENT_TT");
  }
}
