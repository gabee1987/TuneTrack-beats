import { DeckService } from "../decks/DeckService.js";
import type {
  ConfirmRevealPayloadParsed,
  JoinRoomPayloadParsed,
  PlaceCardPayloadParsed,
  PublicRoomState,
  StartGamePayloadParsed,
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

  public confirmReveal(
    confirmRevealPayload: ConfirmRevealPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.confirmReveal(socketId, confirmRevealPayload);
  }
}
