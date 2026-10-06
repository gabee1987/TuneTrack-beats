import type { GameState } from "../domain/GameState.js";
import { ChallengeFlowService } from "./ChallengeFlowService.js";
import type { PlaceCardOptions, StartGameInput } from "./gameFlowTypes.js";
import { PlayerRemovalService } from "./PlayerRemovalService.js";
import { TtActionService } from "./TtActionService.js";
import { TurnFlowService } from "./TurnFlowService.js";

export type {
  PlaceCardOptions,
  StartGameInput,
  StartGamePlayerInput,
} from "./gameFlowTypes.js";

export class GameFlowService {
  private readonly turnFlow = new TurnFlowService();
  private readonly challengeFlow = new ChallengeFlowService();
  private readonly ttActions = new TtActionService();
  private readonly playerRemoval = new PlayerRemovalService(this.challengeFlow);

  public startGame(startGameInput: StartGameInput): GameState {
    return this.turnFlow.startGame(startGameInput);
  }

  public placeCard(
    gameState: GameState,
    playerId: string,
    selectedSlotIndex: number,
    placeCardOptions: PlaceCardOptions = {},
  ): GameState {
    return this.turnFlow.placeCard(gameState, playerId, selectedSlotIndex, placeCardOptions);
  }

  public claimChallenge(gameState: GameState, challengerPlayerId: string): GameState {
    return this.challengeFlow.claimChallenge(gameState, challengerPlayerId);
  }

  public placeChallengeCard(
    gameState: GameState,
    challengerPlayerId: string,
    selectedSlotIndex: number,
  ): GameState {
    return this.challengeFlow.placeChallengeCard(
      gameState,
      challengerPlayerId,
      selectedSlotIndex,
    );
  }

  public resolveChallengeWindow(gameState: GameState): GameState {
    return this.challengeFlow.resolveChallengeWindow(gameState);
  }

  public confirmReveal(gameState: GameState): GameState {
    return this.turnFlow.confirmReveal(gameState);
  }

  public advanceTurnToPlayer(
    gameState: GameState,
    nextActivePlayerId: string,
  ): GameState {
    return this.turnFlow.advanceTurnToPlayer(gameState, nextActivePlayerId);
  }

  public awardTtTokens(
    gameState: GameState,
    playerId: string,
    tokenAmount: number,
  ): GameState {
    return this.ttActions.awardTtTokens(gameState, playerId, tokenAmount);
  }

  public removePlayer(gameState: GameState, playerId: string): GameState {
    return this.playerRemoval.removePlayer(gameState, playerId);
  }

  public skipCurrentTrackWithTt(
    gameState: GameState,
    playerId: string,
  ): GameState {
    return this.ttActions.skipCurrentTrackWithTt(gameState, playerId);
  }

  public buyTimelineCardWithTt(
    gameState: GameState,
    playerId: string,
  ): GameState {
    return this.ttActions.buyTimelineCardWithTt(gameState, playerId);
  }

  public skipOfflinePlayerTurn(gameState: GameState): GameState {
    return this.turnFlow.skipOfflinePlayerTurn(gameState);
  }

  public skipTurnToPlayer(gameState: GameState, nextActivePlayerId: string): GameState {
    return this.turnFlow.skipTurnToPlayer(gameState, nextActivePlayerId);
  }

  public cancelClaimedChallengeForOfflineChallenger(gameState: GameState): GameState {
    return this.challengeFlow.cancelClaimedChallengeForOfflineChallenger(gameState);
  }
}
