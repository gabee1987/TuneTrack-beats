export type PlaylistImportErrorCode =
  | "invalid_url"
  | "playlist_not_found"
  | "playlist_private"
  | "too_few_tracks"
  | "spotify_api_error";

export interface ImportPlaylistSuccessPayload {
  importedCount: number;
  filteredCount: number;
  totalFetched: number;
}

export interface ImportPlaylistErrorPayload {
  code: PlaylistImportErrorCode;
  message: string;
}

export type ImportPlaylistResultPayload =
  | ({ success: true } & ImportPlaylistSuccessPayload)
  | ({ success: false } & ImportPlaylistErrorPayload);
