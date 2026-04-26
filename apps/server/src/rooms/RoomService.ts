import { logger } from "../app/logger.js";
import { DeckService } from "../decks/DeckService.js";
import { PlaylistImportService } from "../decks/PlaylistImportService.js";
import { SpotifyAuthService } from "../spotify/SpotifyAuthService.js";
import type {
  AwardTtPayloadParsed,
  BuyTimelineCardWithTtPayloadParsed,
  CloseRoomPayloadParsed,
  ClaimChallengePayloadParsed,
  ConfirmRevealPayloadParsed,
  GetPlaylistTracksPayloadParsed,
  ImportPlaylistPayloadParsed,
  JoinRoomPayloadParsed,
  PlaceChallengePayloadParsed,
  PlaceCardPayloadParsed,
  PublicRoomState,
  PublicTrackInfo,
  RefreshSpotifyTokenPayloadParsed,
  RemovePlaylistTracksPayloadParsed,
  RequestSpotifyAuthUrlPayloadParsed,
  ResolveChallengeWindowPayloadParsed,
  SkipTrackWithTtPayloadParsed,
  SkipTurnPayloadParsed,
  SpotifyAccountType,
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
    const result = this.roomRegistry.addPlayerToRoom(
      joinRoomPayload.roomId,
      joinRoomPayload.displayName,
      socketId,
      joinRoomPayload.sessionId,
    );
    logger.info(
      { roomId: result.roomState.roomId, playerId: result.playerId, displayName: joinRoomPayload.displayName, playerCount: result.roomState.players.length },
      "player joined room",
    );
    return result;
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
    const roomState = this.roomRegistry.removePlayerBySocketId(socketId);
    if (roomState) {
      logger.info(
        { socketId, roomId: roomState.roomId, playerCount: roomState.players.length, gameStatus: roomState.status },
        "player left room",
      );
    }
    return roomState;
  }

  public startGame(
    startGamePayload: StartGamePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    const importedDeck = this.roomRegistry.getImportedDeck(startGamePayload.roomId);
    const deck = importedDeck
      ? this.deckService.createShuffledDeckFromCards(importedDeck)
      : this.deckService.createShuffledDeck();

    const roomState = this.roomRegistry.startGame(socketId, startGamePayload, deck);
    logger.info(
      { roomId: startGamePayload.roomId, deckSize: deck.length, usingImportedDeck: !!importedDeck, playerCount: roomState.players.length },
      "game started",
    );
    return roomState;
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
    const roomState = this.roomRegistry.placeCard(socketId, placeCardPayload);
    if (roomState.status === "challenge") {
      logger.info(
        { roomId: roomState.roomId, turnNumber: roomState.turn?.turnNumber, activePlayerId: roomState.turn?.activePlayerId },
        "challenge window opened",
      );
    }
    return roomState;
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
    const roomState = this.roomRegistry.confirmReveal(socketId, confirmRevealPayload);
    if (roomState.winnerPlayerId) {
      logger.info({ roomId: roomState.roomId, winnerPlayerId: roomState.winnerPlayerId }, "game won");
    } else if (roomState.status === "turn") {
      logger.info(
        { roomId: roomState.roomId, turnNumber: roomState.turn?.turnNumber, activePlayerId: roomState.turn?.activePlayerId },
        "next turn",
      );
    }
    return roomState;
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
    const roomId = this.roomRegistry.closeRoom(socketId, closeRoomPayload);
    logger.info({ roomId, socketId }, "room closed");
    return roomId;
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

  public getPlaylistTracks(
    payload: GetPlaylistTracksPayloadParsed,
    socketId: string,
  ): PublicTrackInfo[] {
    this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    const deck = this.roomRegistry.getImportedDeck(payload.roomId);
    if (!deck) return [];
    return deck.map(cardToPublicTrackInfo);
  }

  public removePlaylistTracks(
    payload: RemovePlaylistTracksPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; tracks: PublicTrackInfo[] } {
    const roomState = this.roomRegistry.removeTracksFromImportedDeck(
      socketId,
      payload.roomId,
      payload.trackIds,
    );
    logger.info(
      { roomId: payload.roomId, removedCount: payload.trackIds.length, remainingCount: roomState.settings.importedTrackCount },
      "playlist tracks removed",
    );
    const deck = this.roomRegistry.getImportedDeck(payload.roomId);
    const tracks = (deck ?? []).map(cardToPublicTrackInfo);
    return { roomState, tracks };
  }

  public updateSpotifyAuthStatus(
    roomId: string,
    socketId: string,
    connected: boolean,
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    return this.roomRegistry.setSpotifyAuthStatus(
      socketId,
      roomId,
      connected ? "connected" : "none",
      accountType,
    );
  }
}

function cardToPublicTrackInfo(card: { id: string; title: string; artist: string; albumTitle: string; releaseYear: number; artworkUrl?: string }): PublicTrackInfo {
  return {
    id: card.id,
    title: card.title,
    artist: card.artist,
    albumTitle: card.albumTitle,
    releaseYear: card.releaseYear,
    ...(card.artworkUrl ? { artworkUrl: card.artworkUrl } : {}),
  };
}
