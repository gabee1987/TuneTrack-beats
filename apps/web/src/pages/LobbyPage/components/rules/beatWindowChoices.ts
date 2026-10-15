/** The Beat! windows the Rules sheet offers (`22` §4.7); "No limit" is not one of them. */
export const BEAT_WINDOW_SECONDS = [5, 10, 15, 30] as const;

export const NO_LIMIT_CHOICE = "none";

/** A segmented-control value: seconds as text, or `NO_LIMIT_CHOICE` for `null`. */
export function toBeatWindowChoice(seconds: number | null): string {
  return seconds === null ? NO_LIMIT_CHOICE : String(seconds);
}

export function fromBeatWindowChoice(choice: string): number | null {
  return choice === NO_LIMIT_CHOICE ? null : Number(choice);
}

/**
 * The offered windows, plus the room's current one when it is something else (a room created
 * with "No limit" or 3 s keeps showing it until the host picks another).
 */
export function getBeatWindowChoices(current: number | null): Array<number | null> {
  const offered: Array<number | null> = [...BEAT_WINDOW_SECONDS];

  if (current === null) return [...offered, null];
  if (offered.includes(current)) return offered;

  return [...offered, current].sort((first, second) => (first ?? 0) - (second ?? 0));
}
