import { roomDurationsFromEnv } from "../../src/app/createRoomServices.js";
import {
  createRoomCore,
  type RoomCore,
  type RoomDurations,
} from "../../src/rooms/createRoomCore.js";

/** The rooms layer alone, with the validated env durations unless a test shortens one. */
export function createTestRoomCore(overrides: Partial<RoomDurations> = {}): RoomCore {
  return createRoomCore({ ...roomDurationsFromEnv(), ...overrides });
}
