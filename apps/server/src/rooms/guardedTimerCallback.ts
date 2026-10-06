import { logger } from "../app/logger.js";

export type RoomTimerKind =
  | "all_players_offline"
  | "challenge"
  | "host_transfer"
  | "reconnect"
  | "turn_skip";

/** A throw inside a timer would reach Node's uncaught-exception path and end every room. */
export function runGuardedTimerCallback(
  timerKind: RoomTimerKind,
  timerKey: string,
  callback: () => void,
): void {
  try {
    callback();
  } catch (err) {
    logger.error({ err, timerKind, timerKey }, "room timer callback failed");
  }
}
