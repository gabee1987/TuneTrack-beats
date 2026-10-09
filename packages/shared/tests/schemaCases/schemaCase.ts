import type { ZodTypeAny } from "zod";

export interface SchemaCase {
  schema: ZodTypeAny;
  /** Omits every defaulted field, so `defaults` is what parsing fills in. */
  valid: Record<string, unknown>;
  /** Field overrides that sit exactly on a documented limit and must pass. */
  edges?: Record<string, Record<string, unknown>>;
  /** Field overrides one step past a documented limit; each must fail. */
  pastLimits: Record<string, Record<string, unknown>>;
  defaults?: Record<string, unknown>;
}

export type SchemaCases = Record<string, SchemaCase>;

export const TEST_ROOM_ID = "TEST_ROOM_1";
export const TEST_REQUEST_ID = "12345678-1234-4234-8234-123456789012";

/** The room code is shared by every payload; its own limits are covered once in the lobby family. */
export const pastRoomIdLimit = { "room code below the minimum length": { roomId: "ab" } };

export function buildTrack(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `track-${index}`,
    title: `Test Song ${index}`,
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 1990,
    ...overrides,
  };
}

export function buildTracks(count: number) {
  return Array.from({ length: count }, (_, index) => buildTrack(index));
}

export function buildIds(count: number) {
  return Array.from({ length: count }, (_, index) => `track-${index}`);
}

export const nextYear = new Date().getFullYear() + 1;
