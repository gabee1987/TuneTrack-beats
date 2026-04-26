import { DeckService } from "../decks/DeckService.js";
import { PlaylistImportService } from "../decks/PlaylistImportService.js";
import { SpotifyAuthService } from "../spotify/SpotifyAuthService.js";
import type {
  AwardTtPayloadParsed,
  BuyTimelineCardWithTtPayloadParsed,
  CloseRoomPayloadParsed,
  ClaimChallengePayloadParsed,
  ConfirmRevealPayloadParsed,
  ImportPlaylistPayloadParsed,
  JoinRoomPayloadParsed,
  PlaceChallengePayloadParsed,
  PlaceCardPayloadParsed,
  PublicRoomState,
  RefreshSpotifyTokenPayloadParsed,
  RequestSpotifyAuthUrlPayloadParsed,
  ResolveChallengeWindowPayloadParsed,
  SkipTrackWithTtPayloadParsed,
  SkipTurnPayloadParsed,
  StartGamePayloadParsed,
  TransferHostPayloadParsed,
  UpdatePlayerProfilePayloadParsed,
  UpdatePlayerSettingsPayloadParsed,
  UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import type { ImportPlaylistResultPayload } from "@tunetrack/shared";
import { type JoinRoomResult, RoomRegistry } from "./RoomRegistry.js";

export interface ImportPlaylistServiceResult {
  roomState: PublicRoomState;
  resultPayload: ImportPlaylistResultPayload;
}

export interface RefreshTokenResult {
  accessToken: string;
  expiresInSeconds: number;
}

export class RoomService {
  public constructor(
    private readonly roomRegistry: RoomRegistry,
    private readonly deckService: DeckService,
    private readonly spotifyAuthService: SpotifyAuthService,
    private readonly playlistImportService: PlaylistImportService,
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
    const importedDeck = this.roomRegistry.getImportedDeck(startGamePayload.roomId);
    const deck = importedDeck
      ? this.deckService.createShuffledDeckFromCards(importedDeck)
      : this.deckService.createShuffledDeck();

    return this.roomRegistry.startGame(socketId, startGamePayload, deck);
  }

  public transferHost(
    transferHostPayload: TransferHostPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.transferHost(socketId, transferHostPayload);
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

  public skipTurn(
    skipTurnPayload: SkipTurnPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.skipTurn(socketId, skipTurnPayload);
  }

  public closeRoom(
    closeRoomPayload: CloseRoomPayloadParsed,
    socketId: string,
  ): string {
    this.spotifyAuthService.clearHostTokens(closeRoomPayload.roomId);
    return this.roomRegistry.closeRoom(socketId, closeRoomPayload);
  }

  public async importPlaylist(
    payload: ImportPlaylistPayloadParsed,
    socketId: string,
  ): Promise<ImportPlaylistServiceResult> {
    const outcome = await this.playlistImportService.importFromUrl(payload.playlistUrl);

    if (!outcome.success) {
      return {
        roomState: this.roomRegistry.getRoomStateForMember(socketId, payload.roomId),
        resultPayload: outcome.payload,
      };
    }

    const roomState = this.roomRegistry.setImportedDeck(socketId, payload.roomId, outcome.cards);

    return {
      roomState,
      resultPayload: {
        success: true,
        importedCount: outcome.importedCount,
        filteredCount: outcome.filteredCount,
        totalFetched: outcome.totalFetched,
      },
    };
  }

  public buildSpotifyAuthUrl(
    payload: RequestSpotifyAuthUrlPayloadParsed,
    socketId: string,
  ): string {
    return this.spotifyAuthService.buildAuthUrl(payload.roomId, socketId);
  }

  public async refreshSpotifyToken(
    payload: RefreshSpotifyTokenPayloadParsed,
    socketId: string,
  ): Promise<RefreshTokenResult | null> {
    void socketId;
    return this.spotifyAuthService.refreshHostToken(payload.roomId);
  }

  public updateSpotifyAuthStatus(
    roomId: string,
    socketId: string,
    connected: boolean,
  ): PublicRoomState {
    return this.roomRegistry.setSpotifyAuthStatus(
      socketId,
      roomId,
      connected ? "connected" : "none",
    );
  }
}
