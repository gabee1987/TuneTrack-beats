import { DeckService } from "../decks/DeckService.js";
import type {
  AwardTtPayloadParsed,
  BuyTimelineCardWithTtPayloadParsed,
  CloseRoomPayloadParsed,
  ClaimChallengePayloadParsed,
  ConfirmRevealPayloadParsed,
  JoinRoomPayloadParsed,
  PlaceChallengePayloadParsed,
  PlaceCardPayloadParsed,
  PublicRoomState,
  ResolveChallengeWindowPayloadParsed,
  SkipTrackWithTtPayloadParsed,
  StartGamePayloadParsed,
  UpdatePlayerProfilePayloadParsed,
  UpdatePlayerSettingsPayloadParsed,
  UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import { type JoinRoomResult, RoomRegistry } from "./RoomRegistry.js";

export class RoomService {
  public constructor(
    private readonly roomRegistry = new RoomRegistry(),
    private readonly deckService = new DeckService(),
  ) {}

  public setRoomStateChangedListener(
    listener: (roomState: PublicRoomState) => void,
  ): void {
    this.roomRegistry.setRoomStateChangedListener(listener);
  }

  public joinRoom(
    joinRoomPayload: JoinRoomPayloadParsed,
    socketId: string,
  ): JoinRoomResult {
    return this.roomRegistry.addPlayerToRoom(
      joinRoomPayload.roomId,
      joinRoomPayload.displayName,
      socketId,
      joinRoomPayload.sessionId,
    );
  }

  public updateRoomSettings(
    updateRoomSettingsPayload: UpdateRoomSettingsPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updateRoomSettings(
      socketId,
      updateRoomSettingsPayload.roomId,
      updateRoomSettingsPayload,
    );
  }

  public updatePlayerSettings(
    updatePlayerSettingsPayload: UpdatePlayerSettingsPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updatePlayerSettings(
      socketId,
      updatePlayerSettingsPayload,
    );
  }

  public updatePlayerProfile(
    updatePlayerProfilePayload: UpdatePlayerProfilePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updatePlayerProfile(
      socketId,
      updatePlayerProfilePayload,
    );
  }

  public awardTt(
    awardTtPayload: AwardTtPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.awardTt(socketId, awardTtPayload);
  }

  public skipTrackWithTt(
    skipTrackWithTtPayload: SkipTrackWithTtPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.skipTrackWithTt(socketId, skipTrackWithTtPayload);
  }

  public buyTimelineCardWithTt(
    buyTimelineCardWithTtPayload: BuyTimelineCardWithTtPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.buyTimelineCardWithTt(
      socketId,
      buyTimelineCardWithTtPayload,
    );
  }

  public removePlayer(socketId: string): PublicRoomState | null {
    return this.roomRegistry.removePlayerBySocketId(socketId);
  }

  public startGame(
    startGamePayload: StartGamePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.startGame(
      socketId,
      startGamePayload,
      this.deckService.createShuffledDeck(),
    );
  }

  public placeCard(
    placeCardPayload: PlaceCardPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.placeCard(socketId, placeCardPayload);
  }

  public claimChallenge(
    claimChallengePayload: ClaimChallengePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.claimChallenge(socketId, claimChallengePayload);
  }

  public placeChallenge(
    placeChallengePayload: PlaceChallengePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.placeChallenge(socketId, placeChallengePayload);
  }

  public resolveChallengeWindow(
    resolveChallengeWindowPayload: ResolveChallengeWindowPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.resolveChallengeWindow(
      socketId,
      resolveChallengeWindowPayload,
    );
  }

  public confirmReveal(
    confirmRevealPayload: ConfirmRevealPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.confirmReveal(socketId, confirmRevealPayload);
  }

  public closeRoom(
    closeRoomPayload: CloseRoomPayloadParsed,
    socketId: string,
  ): string {
    return this.roomRegistry.closeRoom(socketId, closeRoomPayload);
  }
}
