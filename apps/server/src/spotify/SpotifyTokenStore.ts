import type { SpotifyAccountType } from "@tunetrack/shared";
import type { RoomId } from "@tunetrack/shared";

interface HostTokenRecord {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  accountType: SpotifyAccountType;
}

interface ClientCredentialsRecord {
  token: string;
  expiresAtMs: number;
}

export class SpotifyTokenStore {
  private readonly hostTokensByRoomId = new Map<RoomId, HostTokenRecord>();
  private clientCredentials: ClientCredentialsRecord | null = null;

  public setHostTokens(
    roomId: RoomId,
    accessToken: string,
    refreshToken: string,
    expiresInSeconds: number,
    accountType: SpotifyAccountType,
  ): void {
    this.hostTokensByRoomId.set(roomId, {
      accessToken,
      refreshToken,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
      accountType,
    });
  }

  public getHostTokenRecord(roomId: RoomId): HostTokenRecord | null {
    return this.hostTokensByRoomId.get(roomId) ?? null;
  }

  /** Spotify may rotate the refresh token on a refresh; the old one then stops working (B-19). */
  public updateHostAccessToken(
    roomId: RoomId,
    accessToken: string,
    expiresInSeconds: number,
    rotatedRefreshToken?: string,
  ): void {
    const existing = this.hostTokensByRoomId.get(roomId);
    if (!existing) return;

    this.hostTokensByRoomId.set(roomId, {
      ...existing,
      accessToken,
      refreshToken: rotatedRefreshToken ?? existing.refreshToken,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
    });
  }

  public clearHostTokens(roomId: RoomId): void {
    this.hostTokensByRoomId.delete(roomId);
  }

  public retargetRoom(previousRoomId: RoomId, nextRoomId: RoomId): void {
    const record = this.hostTokensByRoomId.get(previousRoomId);
    if (!record) return;
    this.hostTokensByRoomId.delete(previousRoomId);
    this.hostTokensByRoomId.set(nextRoomId, record);
  }

  public isHostTokenExpired(roomId: RoomId): boolean {
    const record = this.hostTokensByRoomId.get(roomId);
    if (!record) return true;
    return Date.now() >= record.expiresAtMs - 60_000;
  }

  public setClientCredentials(token: string, expiresInSeconds: number): void {
    this.clientCredentials = {
      token,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
    };
  }

  public getClientCredentials(): ClientCredentialsRecord | null {
    return this.clientCredentials;
  }

  public isClientCredentialsExpired(): boolean {
    if (!this.clientCredentials) return true;
    return Date.now() >= this.clientCredentials.expiresAtMs - 60_000;
  }
}
