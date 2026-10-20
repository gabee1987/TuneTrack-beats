import type { PublicRoomState } from "@tunetrack/shared/client";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** What the game header says about the host's own playback (`22` §4.11). */
export type HostPlaybackNotice = "owner" | "practice" | null;

function hasSpotifyAudio(roomState: PublicRoomState): boolean {
  const { settings } = roomState;
  return (
    settings.deckSource === "spotify" &&
    settings.spotifyAuthStatus === "connected" &&
    settings.spotifyPlaybackOwnerPlayerId !== null
  );
}

/**
 * The toast a guest sees on the first turn: where the music plays, or that this round is silent.
 * Later turns and the host get none, so a reload mid-game does not repeat it.
 */
export function getGuestHandoverMessage(
  roomState: PublicRoomState,
  currentPlayerId: string | null,
  t: Translate,
): string | null {
  if (!currentPlayerId || currentPlayerId === roomState.hostId) return null;
  if (roomState.turn?.turnNumber !== 1 || roomState.status === "finished") return null;

  if (!hasSpotifyAudio(roomState)) return t("game.handover.guestNoAudio");

  const ownerName = roomState.players.find(
    (player) => player.id === roomState.settings.spotifyPlaybackOwnerPlayerId,
  )?.displayName;
  return t("game.handover.guest", { host: ownerName ?? t("lobby.players.host") });
}

export function getHostPlaybackNotice(
  roomState: PublicRoomState,
  currentPlayerId: string | null,
): HostPlaybackNotice {
  if (!currentPlayerId) return null;
  if (hasSpotifyAudio(roomState)) {
    return roomState.settings.spotifyPlaybackOwnerPlayerId === currentPlayerId ? "owner" : null;
  }
  const isPracticeHandover =
    roomState.settings.deckSource === "practice" &&
    currentPlayerId === roomState.hostId &&
    roomState.turn?.turnNumber === 1;
  return isPracticeHandover ? "practice" : null;
}

/** "You're next." when the viewer follows the active player, as `findNextActivePlayerId` orders it. */
export function isViewerNextToPlay(
  roomState: PublicRoomState,
  currentPlayerId: string | null,
): boolean {
  const activePlayerId = roomState.turn?.activePlayerId;
  if (roomState.status !== "turn" || !currentPlayerId || activePlayerId === currentPlayerId) {
    return false;
  }

  const { players } = roomState;
  const activeIndex = players.findIndex((player) => player.id === activePlayerId);
  if (activeIndex === -1 || players.length < 2) return false;
  return players[(activeIndex + 1) % players.length]?.id === currentPlayerId;
}
