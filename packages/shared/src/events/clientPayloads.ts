// Type-only view of the payload schemas for the browser entry: every client payload type is the
// schema's input type, so the two cannot drift, and `zod` never reaches the web bundle.
import type { ClientToServerEvent } from "./clientEvents.js";
import type { CuratedPlaylistTrackPayload } from "./schemas/commonSchemas.js";
import type {
  BuyTimelineCardWithTtPayload,
  ClaimChallengePayload,
  ConfirmRevealPayload,
  PlaceCardPayload,
  PlaceChallengePayload,
  ResolveChallengeWindowPayload,
  SkipTrackWithTtPayload,
  SkipTurnPayload,
  StartGamePayload,
} from "./schemas/gameplaySchemas.js";
import type {
  AwardTtPayload,
  CloseRoomPayload,
  CreateRoomPayload,
  GetRoomPreviewPayload,
  JoinRoomPayload,
  KickPlayerPayload,
  RenameRoomPayload,
  TransferHostPayload,
  UpdatePlayerProfilePayload,
  UpdatePlayerSettingsPayload,
  UpdateRoomSettingsPayload,
} from "./schemas/lobbySchemas.js";
import type {
  GetPlaylistTracksPayload,
  ImportPlaylistPayload,
  LoadCuratedPlaylistPayload,
  RemovePlaylistTracksPayload,
  UpdatePlaylistTrackPayload,
} from "./schemas/playlistSchemas.js";
import type {
  GenerateSpotifyCandidatesPayload,
  OpenSpotifyPlaylistPayload,
  PlaySpotifyTrackPayload,
  RefreshSpotifyTokenPayload,
  RegisterSpotifyPlaybackDevicePayload,
  RequestSpotifyAuthUrlPayload,
  SearchSpotifyMusicPayload,
  SearchSpotifyPlaylistsPayload,
  UnregisterSpotifyPlaybackDevicePayload,
  UseSpotifyCandidatesPayload,
} from "./schemas/spotifySchemas.js";

export type {
  AwardTtPayload,
  BuyTimelineCardWithTtPayload,
  ClaimChallengePayload,
  CloseRoomPayload,
  ConfirmRevealPayload,
  CreateRoomPayload,
  CuratedPlaylistTrackPayload,
  GenerateSpotifyCandidatesPayload,
  GetPlaylistTracksPayload,
  GetRoomPreviewPayload,
  ImportPlaylistPayload,
  JoinRoomPayload,
  KickPlayerPayload,
  LoadCuratedPlaylistPayload,
  OpenSpotifyPlaylistPayload,
  PlaceCardPayload,
  PlaceChallengePayload,
  PlaySpotifyTrackPayload,
  RefreshSpotifyTokenPayload,
  RegisterSpotifyPlaybackDevicePayload,
  RemovePlaylistTracksPayload,
  RenameRoomPayload,
  RequestSpotifyAuthUrlPayload,
  ResolveChallengeWindowPayload,
  SearchSpotifyMusicPayload,
  SearchSpotifyPlaylistsPayload,
  SkipTrackWithTtPayload,
  SkipTurnPayload,
  StartGamePayload,
  TransferHostPayload,
  UnregisterSpotifyPlaybackDevicePayload,
  UpdatePlayerProfilePayload,
  UpdatePlayerSettingsPayload,
  UpdatePlaylistTrackPayload,
  UpdateRoomSettingsPayload,
  UseSpotifyCandidatesPayload,
};

type Events = typeof ClientToServerEvent;

// Indexed below by every key of `ClientToServerEvent`, so a new event without a payload type
// does not compile.
interface PayloadsByEventKey {
  AwardTt: AwardTtPayload;
  BuyTimelineCardWithTt: BuyTimelineCardWithTtPayload;
  ClaimChallenge: ClaimChallengePayload;
  CloseRoom: CloseRoomPayload;
  ConfirmReveal: ConfirmRevealPayload;
  CreateRoom: CreateRoomPayload;
  GetRoomPreview: GetRoomPreviewPayload;
  GetPlaylistTracks: GetPlaylistTracksPayload;
  GenerateSpotifyCandidates: GenerateSpotifyCandidatesPayload;
  ImportPlaylist: ImportPlaylistPayload;
  JoinRoom: JoinRoomPayload;
  KickPlayer: KickPlayerPayload;
  ListRooms: Record<string, never>;
  LoadCuratedPlaylist: LoadCuratedPlaylistPayload;
  OpenSpotifyPlaylist: OpenSpotifyPlaylistPayload;
  PlaceCard: PlaceCardPayload;
  PlaceChallenge: PlaceChallengePayload;
  RefreshSpotifyToken: RefreshSpotifyTokenPayload;
  PlaySpotifyTrack: PlaySpotifyTrackPayload;
  RegisterSpotifyPlaybackDevice: RegisterSpotifyPlaybackDevicePayload;
  UnregisterSpotifyPlaybackDevice: UnregisterSpotifyPlaybackDevicePayload;
  RemovePlaylistTracks: RemovePlaylistTracksPayload;
  RenameRoom: RenameRoomPayload;
  RequestSpotifyAuthUrl: RequestSpotifyAuthUrlPayload;
  ResolveChallengeWindow: ResolveChallengeWindowPayload;
  SearchSpotifyPlaylists: SearchSpotifyPlaylistsPayload;
  SearchSpotifyMusic: SearchSpotifyMusicPayload;
  SkipTrackWithTt: SkipTrackWithTtPayload;
  SkipTurn: SkipTurnPayload;
  StartGame: StartGamePayload;
  TransferHost: TransferHostPayload;
  UpdatePlayerProfile: UpdatePlayerProfilePayload;
  UpdatePlayerSettings: UpdatePlayerSettingsPayload;
  UpdatePlaylistTrack: UpdatePlaylistTrackPayload;
  UpdateRoomSettings: UpdateRoomSettingsPayload;
  UseSpotifyCandidates: UseSpotifyCandidatesPayload;
}

/** The payload each client event carries, by wire name; `list_rooms` carries none. */
export type ClientToServerPayloads = {
  [Key in keyof Events as Events[Key]]: PayloadsByEventKey[Key];
};
