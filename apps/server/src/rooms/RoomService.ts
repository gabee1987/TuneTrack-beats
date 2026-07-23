import { logger } from "../app/logger.js";
import { logAuditEvent } from "../app/auditLogger.js";
import { DeckService } from "../decks/DeckService.js";
import { PlaylistImportService } from "../decks/PlaylistImportService.js";
import { SpotifyAuthService } from "../spotify/SpotifyAuthService.js";
import { SpotifyDiscoveryService } from "../spotify/SpotifyDiscoveryService.js";
import { SpotifyMusicSearchService } from "../spotify/SpotifyMusicSearchService.js";
import type { SpotifyPlaybackSessionStore } from "../spotify/SpotifyPlaybackSessionStore.js";
import type { GameTrackCard } from "@tunetrack/game-engine";
import type {
  AwardTtPayloadParsed,
  BuyTimelineCardWithTtPayloadParsed,
  CloseRoomPayloadParsed,
  ClaimChallengePayloadParsed,
  ConfirmRevealPayloadParsed,
  CreateRoomPayloadParsed,
  GetRoomPreviewPayloadParsed,
  GetPlaylistTracksPayloadParsed,
  ImportPlaylistPayloadParsed,
  JoinRoomPayloadParsed,
  LoadCuratedPlaylistPayloadParsed,
  OpenSpotifyPlaylistPayloadParsed,
  PlaceChallengePayloadParsed,
  PlaceCardPayloadParsed,
  PublicRoomState,
  PublicRoomSummary,
  PublicTrackInfo,
  RefreshSpotifyTokenPayloadParsed,
  PlaySpotifyTrackPayloadParsed,
  RegisterSpotifyPlaybackDevicePayloadParsed,
  UnregisterSpotifyPlaybackDevicePayloadParsed,
  RenameRoomPayloadParsed,
  RemovePlaylistTracksPayloadParsed,
  RequestSpotifyAuthUrlPayloadParsed,
  ResolveChallengeWindowPayloadParsed,
  SkipTrackWithTtPayloadParsed,
  KickPlayerPayloadParsed,
  SkipTurnPayloadParsed,
  SpotifyAccountType,
  SpotifyPlaybackResultPayload,
  StartGamePayloadParsed,
  GenerateSpotifyCandidatesPayloadParsed,
  SearchSpotifyMusicPayloadParsed,
  SearchSpotifyPlaylistsPayloadParsed,
  SpotifyCandidatesAppliedPayload,
  SpotifyCandidatesGeneratedPayload,
  SpotifyPlaylistDetailPayload,
  SpotifyPlaylistSearchResultPayload,
  SpotifySmartSearchResultPayload,
  TransferHostPayloadParsed,
  UpdatePlaylistTrackPayloadParsed,
  UpdatePlayerProfilePayloadParsed,
  UpdatePlayerSettingsPayloadParsed,
  UpdateRoomSettingsPayloadParsed,
  UseSpotifyCandidatesPayloadParsed,
} from "@tunetrack/shared";
import type { ImportPlaylistResultPayload } from "@tunetrack/shared";
import { type JoinRoomResult, type KickPlayerResult, RoomRegistry } from "./RoomRegistry.js";

export interface ImportPlaylistServiceResult {
  roomState: PublicRoomState;
  resultPayload: ImportPlaylistResultPayload;
}

export interface RefreshTokenResult {
  result: { accessToken: string; expiresInSeconds: number } | null;
  roomState: PublicRoomState | null;
}

export interface UseSpotifyCandidatesResult {
  payload: SpotifyCandidatesAppliedPayload;
  roomState: PublicRoomState | null;
  tracks: PublicTrackInfo[] | null;
}

export interface RenameRoomResult {
  previousRoomId: string;
  roomState: PublicRoomState;
}

export class RoomService {
  public constructor(
    private readonly roomRegistry: RoomRegistry,
    private readonly deckService: DeckService,
    private readonly spotifyAuthService: SpotifyAuthService,
    private readonly playlistImportService: PlaylistImportService,
    private readonly spotifyDiscoveryService: SpotifyDiscoveryService,
    private readonly spotifyMusicSearchService: SpotifyMusicSearchService,
    private readonly spotifyPlaybackSessions: SpotifyPlaybackSessionStore,
  ) {
    this.roomRegistry.setSpotifyPlaybackHandoffListener((roomId) => {
      this.spotifyPlaybackSessions.beginHandoff(roomId);
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "playback_handoff_started",
        outcome: "succeeded",
        roomId,
      });
      void this.spotifyAuthService.pauseRoomPlayback(roomId);
    });
  }

  public setRoomStateChangedListener(listener: (roomState: PublicRoomState) => void): void {
    this.roomRegistry.setRoomStateChangedListener(listener);
  }

  public joinRoom(joinRoomPayload: JoinRoomPayloadParsed, socketId: string): JoinRoomResult {
    const result = this.roomRegistry.addPlayerToRoom(
      joinRoomPayload.roomId,
      joinRoomPayload.displayName,
      socketId,
      joinRoomPayload.sessionId,
    );
    logger.info(
      {
        roomId: result.roomState.roomId,
        playerId: result.playerId,
        displayName: joinRoomPayload.displayName,
        playerCount: result.roomState.players.length,
      },
      "player joined room",
    );
    return result;
  }

  public createRoom(createRoomPayload: CreateRoomPayloadParsed, socketId: string): JoinRoomResult {
    const result = this.roomRegistry.createRoom(
      createRoomPayload.roomId,
      createRoomPayload.displayName,
      socketId,
      createRoomPayload.sessionId,
    );
    logger.info(
      {
        roomId: result.roomState.roomId,
        playerId: result.playerId,
        displayName: createRoomPayload.displayName,
      },
      "room created",
    );
    return result;
  }

  public listRooms(): PublicRoomSummary[] {
    return this.roomRegistry.listRoomSummaries();
  }

  public getRoomPreview(payload: GetRoomPreviewPayloadParsed): PublicRoomSummary | null {
    return this.roomRegistry.getRoomSummary(payload.roomId);
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

  public renameRoom(
    renameRoomPayload: RenameRoomPayloadParsed,
    socketId: string,
  ): RenameRoomResult {
    const result = this.roomRegistry.renameRoom(socketId, renameRoomPayload);
    logger.info(
      {
        nextRoomId: result.roomState.roomId,
        previousRoomId: result.previousRoomId,
        socketId,
      },
      "room renamed",
    );
    return result;
  }

  public updatePlayerSettings(
    updatePlayerSettingsPayload: UpdatePlayerSettingsPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updatePlayerSettings(socketId, updatePlayerSettingsPayload);
  }

  public updatePlayerProfile(
    updatePlayerProfilePayload: UpdatePlayerProfilePayloadParsed,
    socketId: string,
  ): PublicRoomState {
    return this.roomRegistry.updatePlayerProfile(socketId, updatePlayerProfilePayload);
  }

  public awardTt(awardTtPayload: AwardTtPayloadParsed, socketId: string): PublicRoomState {
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
    return this.roomRegistry.buyTimelineCardWithTt(socketId, buyTimelineCardWithTtPayload);
  }

  public removePlayer(socketId: string): PublicRoomState | null {
    this.spotifyPlaybackSessions.unregisterBySocketId(socketId);
    const roomState = this.roomRegistry.removePlayerBySocketId(socketId);
    if (roomState) {
      logger.info(
        {
          socketId,
          roomId: roomState.roomId,
          playerCount: roomState.players.length,
          gameStatus: roomState.status,
        },
        "player left room",
      );
    }
    return roomState;
  }

  public startGame(startGamePayload: StartGamePayloadParsed, socketId: string): PublicRoomState {
    const importedDeck = this.roomRegistry.getImportedDeck(startGamePayload.roomId);
    const deck = importedDeck
      ? this.deckService.createShuffledDeckFromCards(importedDeck)
      : this.deckService.createShuffledDeck();

    const roomState = this.roomRegistry.startGame(socketId, startGamePayload, deck);
    logger.info(
      {
        roomId: startGamePayload.roomId,
        deckSize: deck.length,
        usingImportedDeck: !!importedDeck,
        playerCount: roomState.players.length,
      },
      "game started",
    );
    return roomState;
  }

  public transferHost(
    transferHostPayload: TransferHostPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    // Playback ownership + generation bump happen in buildHostTransferredRoomState;
    // beginHandoff is emitted from RoomConnectionService.applyHostTransfer.
    return this.roomRegistry.transferHost(socketId, transferHostPayload);
  }

  public kickPlayer(
    kickPlayerPayload: KickPlayerPayloadParsed,
    socketId: string,
  ): KickPlayerResult {
    return this.roomRegistry.kickPlayer(socketId, kickPlayerPayload);
  }

  public placeCard(placeCardPayload: PlaceCardPayloadParsed, socketId: string): PublicRoomState {
    const roomState = this.roomRegistry.placeCard(socketId, placeCardPayload);
    if (roomState.status === "challenge") {
      logger.info(
        {
          roomId: roomState.roomId,
          turnNumber: roomState.turn?.turnNumber,
          activePlayerId: roomState.turn?.activePlayerId,
        },
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
    return this.roomRegistry.resolveChallengeWindow(socketId, resolveChallengeWindowPayload);
  }

  public confirmReveal(
    confirmRevealPayload: ConfirmRevealPayloadParsed,
    socketId: string,
  ): PublicRoomState {
    const roomState = this.roomRegistry.confirmReveal(socketId, confirmRevealPayload);
    if (roomState.winnerPlayerId) {
      logger.info(
        { roomId: roomState.roomId, winnerPlayerId: roomState.winnerPlayerId },
        "game won",
      );
    } else if (roomState.status === "turn") {
      logger.info(
        {
          roomId: roomState.roomId,
          turnNumber: roomState.turn?.turnNumber,
          activePlayerId: roomState.turn?.activePlayerId,
        },
        "next turn",
      );
    }
    return roomState;
  }

  public skipTurn(skipTurnPayload: SkipTurnPayloadParsed, socketId: string): PublicRoomState {
    return this.roomRegistry.skipTurn(socketId, skipTurnPayload);
  }

  public closeRoom(closeRoomPayload: CloseRoomPayloadParsed, socketId: string): string {
    this.spotifyAuthService.clearHostTokens(closeRoomPayload.roomId);
    this.spotifyPlaybackSessions.clearRoom(closeRoomPayload.roomId);
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
        ...(outcome.playlistName ? { playlistName: outcome.playlistName } : {}),
      },
    };
  }

  public loadCuratedPlaylist(
    payload: LoadCuratedPlaylistPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; tracks: PublicTrackInfo[] } {
    const deck: GameTrackCard[] = payload.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumTitle: track.albumTitle,
      releaseYear: track.releaseYear,
      sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
      metadataStatus: track.metadataStatus,
      ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
      ...(track.previewUrl ? { previewUrl: track.previewUrl } : {}),
      ...(track.spotifyTrackUri ? { spotifyTrackUri: track.spotifyTrackUri } : {}),
    }));

    const { roomState, deck: nextDeck } = this.roomRegistry.updateImportedDeck(
      socketId,
      payload.roomId,
      deck,
      payload.mode,
    );
    logger.info(
      { roomId: payload.roomId, mode: payload.mode, trackCount: nextDeck.length },
      "curated playlist loaded",
    );
    return { roomState, tracks: nextDeck.map(cardToPublicTrackInfo) };
  }

  public buildSpotifyAuthUrl(
    payload: RequestSpotifyAuthUrlPayloadParsed,
    socketId: string,
  ): string {
    return this.spotifyAuthService.buildAuthUrl(payload.roomId, socketId, payload.clientOrigin);
  }

  public searchSpotifyPlaylists(
    payload: SearchSpotifyPlaylistsPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaylistSearchResultPayload> {
    this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    return this.spotifyDiscoveryService.searchPlaylists(
      payload.roomId,
      payload.query,
      payload.limit,
    );
  }

  public searchSpotifyMusic(
    payload: SearchSpotifyMusicPayloadParsed,
    socketId: string,
  ): Promise<SpotifySmartSearchResultPayload> {
    this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    return this.spotifyMusicSearchService.search(
      payload.roomId,
      payload.query,
      payload.limit,
      payload.offset,
      payload.types,
    );
  }

  public openSpotifyPlaylist(
    payload: OpenSpotifyPlaylistPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaylistDetailPayload> {
    this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    return this.spotifyMusicSearchService.getPlaylistDetail(
      payload.roomId,
      payload.playlistId,
      payload.sourceType,
    );
  }

  public generateSpotifyCandidates(
    payload: GenerateSpotifyCandidatesPayloadParsed,
    socketId: string,
  ): Promise<SpotifyCandidatesGeneratedPayload> {
    this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    return this.spotifyDiscoveryService
      .generateCandidates(payload.roomId, payload.source)
      .then((result) => result.payload);
  }

  public useSpotifyCandidates(
    payload: UseSpotifyCandidatesPayloadParsed,
    socketId: string,
  ): UseSpotifyCandidatesResult {
    const result = this.spotifyDiscoveryService.applyCandidates(
      payload.roomId,
      payload.candidateSessionId,
      payload.trackIds,
      payload.tracks,
    );

    if (!result.cards) {
      return {
        payload: result.payload,
        roomState: null,
        tracks: null,
      };
    }

    const { roomState, deck } = this.roomRegistry.updateImportedDeck(
      socketId,
      payload.roomId,
      result.cards,
      payload.mode,
    );

    return {
      payload: result.payload.success
        ? { ...result.payload, importedCount: deck.length }
        : result.payload,
      roomState,
      tracks: deck.map(cardToPublicTrackInfo),
    };
  }

  public async refreshSpotifyToken(
    payload: RefreshSpotifyTokenPayloadParsed,
    socketId: string,
  ): Promise<RefreshTokenResult> {
    try {
      this.roomRegistry.requireSpotifyPlaybackOwner(socketId, payload.roomId);
    } catch {
      return { result: null, roomState: null };
    }

    const result = await this.spotifyAuthService.refreshHostToken(payload.roomId);

    if (result.success) {
      return {
        result: {
          accessToken: result.accessToken,
          expiresInSeconds: result.expiresInSeconds,
        },
        roomState: null,
      };
    }

    if (result.reason === "invalid_grant") {
      return {
        result: null,
        roomState: this.updateSpotifyAuthStatus(payload.roomId, socketId, false, null),
      };
    }

    return { result: null, roomState: null };
  }

  public async playSpotifyTrack(
    payload: PlaySpotifyTrackPayloadParsed,
    socketId: string,
  ): Promise<SpotifyPlaybackResultPayload> {
    const roomState = this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    const currentPlaybackGeneration = roomState.settings.spotifyPlaybackGeneration ?? 0;

    if (payload.playbackGeneration !== currentPlaybackGeneration) {
      return {
        success: false,
        requestId: payload.requestId,
        code: "stale_playback_generation",
        message: "Playback moved to a different host. Retry after reclaiming the player.",
      };
    }

    try {
      this.roomRegistry.requireSpotifyPlaybackOwner(socketId, payload.roomId);
    } catch {
      return {
        success: false,
        requestId: payload.requestId,
        code: "not_playback_owner",
        message: "Only the current host can control Spotify playback.",
      };
    }

    this.spotifyPlaybackSessions.registerDevice(payload.roomId, socketId, payload.deviceId);
    this.spotifyPlaybackSessions.beginPlayRequest(payload.roomId, payload.requestId);

    return this.spotifyPlaybackSessions.runExclusive(payload.roomId, async () => {
      if (!this.spotifyPlaybackSessions.isActivePlayRequest(payload.roomId, payload.requestId)) {
        return {
          success: false,
          requestId: payload.requestId,
          code: "superseded",
          message: "A newer playback request replaced this one.",
        } as const;
      }

      return this.spotifyAuthService.playTrackOnHostDevice(
        payload.roomId,
        payload.deviceId,
        payload.spotifyTrackUri,
        {
          requestId: payload.requestId,
          isSuperseded: () =>
            !this.spotifyPlaybackSessions.isActivePlayRequest(payload.roomId, payload.requestId),
        },
      );
    });
  }

  public registerSpotifyPlaybackDevice(
    payload: RegisterSpotifyPlaybackDevicePayloadParsed,
    socketId: string,
  ): void {
    const roomState = this.roomRegistry.getRoomStateForMember(socketId, payload.roomId);
    const currentPlaybackGeneration = roomState.settings.spotifyPlaybackGeneration ?? 0;

    // Soft-ignore stale registrations during handoff races — never surface as a room error toast.
    if (payload.playbackGeneration !== currentPlaybackGeneration) {
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "playback_device_register_ignored_stale",
        outcome: "succeeded",
        roomId: payload.roomId,
        socketId,
        meta: {
          deviceId: payload.deviceId,
          payloadGeneration: payload.playbackGeneration,
          currentGeneration: currentPlaybackGeneration,
        },
      });
      return;
    }

    this.roomRegistry.requireSpotifyPlaybackOwner(socketId, payload.roomId);
    this.spotifyPlaybackSessions.registerDevice(payload.roomId, socketId, payload.deviceId);
    logAuditEvent({
      auditKind: "spotify_auth",
      action: "playback_device_registered",
      outcome: "succeeded",
      roomId: payload.roomId,
      socketId,
      meta: {
        deviceId: payload.deviceId,
        playbackGeneration: payload.playbackGeneration,
      },
    });
  }

  public unregisterSpotifyPlaybackDevice(
    payload: UnregisterSpotifyPlaybackDevicePayloadParsed,
    socketId: string,
  ): void {
    this.spotifyPlaybackSessions.unregisterDevice(payload.roomId, socketId);
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
      {
        roomId: payload.roomId,
        removedCount: payload.trackIds.length,
        remainingCount: roomState.settings.importedTrackCount,
      },
      "playlist tracks removed",
    );
    const deck = this.roomRegistry.getImportedDeck(payload.roomId);
    const tracks = (deck ?? []).map(cardToPublicTrackInfo);
    return { roomState, tracks };
  }

  public updatePlaylistTrack(
    payload: UpdatePlaylistTrackPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; tracks: PublicTrackInfo[] } {
    const roomState = this.roomRegistry.updateImportedDeckTrack(socketId, payload);
    logger.info({ roomId: payload.roomId, trackId: payload.trackId }, "playlist track updated");
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

function cardToPublicTrackInfo(card: {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus?: "imported" | "edited" | "verified";
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}): PublicTrackInfo {
  return {
    id: card.id,
    title: card.title,
    artist: card.artist,
    albumTitle: card.albumTitle,
    releaseYear: card.releaseYear,
    sourceReleaseYear: card.sourceReleaseYear ?? card.releaseYear,
    metadataStatus: card.metadataStatus ?? "imported",
    ...(card.artworkUrl ? { artworkUrl: card.artworkUrl } : {}),
    ...(card.previewUrl ? { previewUrl: card.previewUrl } : {}),
    ...(card.spotifyTrackUri ? { spotifyTrackUri: card.spotifyTrackUri } : {}),
  };
}
