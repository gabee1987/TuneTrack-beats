/** Every rule violation the engine reports; each is also a server error code. */
export type GameRuleErrorCode =
  | "ACTIVE_PLAYER_CANNOT_CHALLENGE"
  | "ACTIVE_PLAYER_NOT_FOUND"
  | "ACTIVE_PLAYER_UNCHANGED"
  | "CHALLENGE_ALREADY_CLAIMED"
  | "CHALLENGE_SLOT_MUST_DIFFER"
  | "CHALLENGE_WINDOW_EXPIRED"
  | "CURRENT_CARD_NOT_AVAILABLE"
  | "GAME_NOT_IN_CHALLENGE_PHASE"
  | "GAME_NOT_IN_CLAIMED_CHALLENGE_PHASE"
  | "GAME_NOT_IN_REVEAL_PHASE"
  | "GAME_NOT_IN_TURN_PHASE"
  | "INSUFFICIENT_TT"
  | "INVALID_SLOT_INDEX"
  | "INVALID_TARGET_TIMELINE_CARD_COUNT"
  | "INVALID_TT_AMOUNT"
  | "NOT_ACTIVE_PLAYER"
  | "NOT_ENOUGH_CARDS"
  | "NOT_ENOUGH_PLAYERS"
  | "ONLY_CHALLENGE_OWNER_CAN_PLACE"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_TIMELINE_NOT_FOUND"
  | "SKIP_ALREADY_USED_THIS_TURN"
  | "VALID_SLOT_NOT_FOUND";

export class GameRuleError extends Error {
  public constructor(public readonly code: GameRuleErrorCode) {
    super(code);
    this.name = "GameRuleError";
  }
}
