export const DEFAULT_SOCKET_ERROR_MESSAGE =
  "The requested room action could not be completed.";

export const renameRoomErrorMessages: Record<string, string> = {
  GAME_ALREADY_STARTED: "Room names can only be changed before the game starts.",
  ONLY_HOST_CAN_RENAME_ROOM: "Only the host can rename the room.",
  ROOM_ALREADY_EXISTS: "A room with that name already exists.",
};

export const joinRoomErrorMessages: Record<string, string> = {
  GAME_ALREADY_STARTED: "This game has already started.",
  ROOM_NOT_FOUND: "That room is no longer available.",
};

export const createRoomErrorMessages: Record<string, string> = {
  ROOM_ALREADY_EXISTS: "A room with that name already exists.",
  ROOM_LIMIT_REACHED:
    "The room limit has been reached. Close a room before creating a new one.",
};

export const transferHostErrorMessages: Record<string, string> = {
  HOST_TRANSFER_TARGET_DISCONNECTED:
    "Host controls can only be transferred to a connected player.",
  HOST_TRANSFER_TARGET_IS_ALREADY_HOST: "That player already has host controls.",
  HOST_TRANSFER_TARGET_NOT_FOUND: "That player is no longer in the room.",
  ONLY_HOST_CAN_TRANSFER_HOST: "Only the current host can transfer host controls.",
};

export const kickPlayerErrorMessages: Record<string, string> = {
  CANNOT_KICK_YOURSELF: "You cannot kick yourself from the room.",
  ONLY_HOST_CAN_KICK_PLAYER: "Only the host can kick players.",
  PLAYER_NOT_FOUND: "That player is no longer in the room.",
};

export const startGameErrorMessages: Record<string, string> = {
  GAME_ALREADY_STARTED: "This game has already started.",
  NOT_ENOUGH_CARDS: "There are not enough cards to start this game.",
  ONLY_HOST_CAN_START_GAME: "Only the host can start the game.",
};

export const placeCardErrorMessages: Record<string, string> = {
  GAME_NOT_IN_TURN_PHASE: "Cards can only be placed during a turn.",
  GAME_NOT_STARTED: "The game has not started yet.",
  INVALID_SLOT_INDEX: "Selected timeline slot is invalid.",
  NOT_ACTIVE_PLAYER: "It is not your turn.",
};

export const confirmRevealErrorMessages: Record<string, string> = {
  GAME_NOT_IN_REVEAL_PHASE: "Reveal can only be confirmed after a placement.",
  GAME_NOT_STARTED: "The game has not started yet.",
  ONLY_HOST_CAN_CONFIRM_REVEAL: "Only the host can confirm the reveal.",
  ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL:
    "Only the host or active player can confirm the reveal.",
};

export const claimChallengeErrorMessages: Record<string, string> = {
  ACTIVE_PLAYER_CANNOT_CHALLENGE: "The active player cannot use Beat! on their own turn.",
  CHALLENGE_ALREADY_CLAIMED: "Another player already claimed Beat! first.",
  CHALLENGE_WINDOW_EXPIRED: "The Beat! window already expired.",
  GAME_NOT_IN_CHALLENGE_PHASE: "Beat! is only available during the challenge window.",
  INSUFFICIENT_TT: "You need at least 1 TT to use Beat!.",
};

export const placeChallengeErrorMessages: Record<string, string> = {
  CHALLENGE_WINDOW_EXPIRED: "The Beat! window already expired.",
  GAME_NOT_IN_CHALLENGE_PHASE:
    "Challenge placement is only available during the challenge window.",
  INVALID_SLOT_INDEX: "Selected timeline slot is invalid.",
  CHALLENGE_SLOT_MUST_DIFFER: "Beat! must point to a different slot than the original choice.",
  ONLY_CHALLENGE_OWNER_CAN_PLACE:
    "Only the player who claimed Beat! can place the challenge slot.",
};

export const resolveChallengeWindowErrorMessages: Record<string, string> = {
  CHALLENGE_ALREADY_CLAIMED:
    "The challenge window is already claimed and cannot be resolved yet.",
  GAME_NOT_IN_CHALLENGE_PHASE:
    "Challenge resolution is only available during the challenge window.",
  ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW:
    "Only the host can manually resolve the challenge window.",
  ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW:
    "Only the host or active player can manually resolve the challenge window.",
};

export const playerSettingsErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS: "Only the host can change player settings.",
};

export const playerProfileErrorMessages: Record<string, string> = {
  GAME_ALREADY_STARTED: "Names can only be changed before the game starts.",
};

export const awardTtErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_AWARD_TT: "Only the host can award TT.",
  PLAYER_NOT_FOUND: "That player is no longer in the room.",
  INVALID_TT_AMOUNT: "TT award amount is invalid.",
};

export const skipTrackWithTtErrorMessages: Record<string, string> = {
  GAME_NOT_IN_TURN_PHASE: "You can only skip on your own turn.",
  GAME_NOT_STARTED: "The game has not started yet.",
  INSUFFICIENT_TT: "You need at least 1 TT to skip.",
  NOT_ENOUGH_CARDS: "The deck is empty, so this track cannot be skipped.",
  NOT_ACTIVE_PLAYER: "Only the active player can skip the current track.",
  SKIP_ALREADY_USED_THIS_TURN: "You already used your one allowed skip on this turn.",
  TT_MODE_DISABLED: "TT mode is disabled in this room.",
};

export const skipTurnErrorMessages: Record<string, string> = {
  GAME_NOT_IN_TURN_PHASE: "The game must be in turn phase to skip a turn.",
  GAME_NOT_STARTED: "The game has not started yet.",
  ONLY_HOST_CAN_SKIP_TURN: "Only the host can skip a turn.",
};

export const buyTimelineCardWithTtErrorMessages: Record<string, string> = {
  GAME_NOT_IN_TURN_PHASE: "You can only buy a card on your own turn.",
  GAME_NOT_STARTED: "The game has not started yet.",
  INSUFFICIENT_TT: "You need at least 3 TT to buy a card.",
  NOT_ENOUGH_CARDS: "The deck is empty, so no card can be bought.",
  NOT_ACTIVE_PLAYER: "Only the active player can buy a timeline card.",
  TT_MODE_DISABLED: "TT mode is disabled in this room.",
};

export const roomSettingsErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS: "Only the host can change room settings.",
};

export const closeRoomErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_CLOSE_ROOM: "Only the host can close the room.",
};

export const loadCuratedPlaylistErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_IMPORT_PLAYLIST: "Only the host can load a saved playlist.",
};

export const useSpotifyCandidatesErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_IMPORT_PLAYLIST: "Only the host can use generated playlists.",
};

export const removePlaylistTracksErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_EDIT_PLAYLIST: "Only the host can edit the playlist.",
  NO_PLAYLIST_IMPORTED: "No playlist has been imported.",
};

export const updatePlaylistTrackErrorMessages: Record<string, string> = {
  ONLY_HOST_CAN_EDIT_PLAYLIST: "Only the host can edit the playlist.",
  NO_PLAYLIST_IMPORTED: "No playlist has been imported.",
  PLAYLIST_TRACK_NOT_FOUND: "That playlist track is no longer available.",
};

export function resolveSocketErrorMessage(
  code: string,
  messageByCode: Record<string, string>,
): string {
  return messageByCode[code] ?? DEFAULT_SOCKET_ERROR_MESSAGE;
}
