export type SpotifyAccountType = "free" | "premium";

export interface SpotifyAuthSuccessPayload {
  accessToken: string;
  accountType: SpotifyAccountType;
  expiresInSeconds: number;
}

export interface SpotifyAuthErrorPayload {
  code: "auth_denied" | "exchange_failed" | "unknown";
  message: string;
}

export type SpotifyAuthResultPayload =
  | ({ success: true } & SpotifyAuthSuccessPayload)
  | ({ success: false } & SpotifyAuthErrorPayload);
