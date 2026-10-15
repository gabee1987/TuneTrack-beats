import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  DEFAULT_TT_MODE_ENABLED,
  getRequiredDeckSize,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
} from "@tunetrack/shared/client";
import type { ConnectionStatus } from "../../../services/socket/connectionState";
import type { StartGameActionStatus } from "../LobbyPage.types";

/** The strip shows everyone up to this many; beyond it, the first three and "+N more". */
export const PLAYERS_STRIP_LIMIT = 4;
const PLAYERS_STRIP_SHOWN_WHEN_FULL = 3;

export interface LobbySetupInput {
  connectionStatus: ConnectionStatus;
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
  settings: PublicRoomSettings;
  startGameActionStatus: StartGameActionStatus;
}

/** First match wins (`22` §4.10); every reason keeps Start disabled. */
export type LobbyStartReason =
  | { kind: "connection"; status: ConnectionStatus }
  | { kind: "creating" }
  | { kind: "noDeck" }
  | { kind: "pending" }
  | { kind: "retrying" };

/** Start stays enabled; the note warns or informs. */
export type LobbyStartNote =
  | { kind: "noAudio" }
  | { kind: "shortDeck"; meter: LobbyDeckMeter }
  | { kind: "solo" };

export interface LobbyDeckMeter {
  current: number;
  isEnough: boolean;
  playerCount: number;
  required: number;
  target: number;
}

export type LobbyMusicStatus =
  | { kind: "none" }
  | { kind: "practice"; songCount: number }
  | { kind: "spotifyUnconnected"; songCount: number }
  | { kind: "spotifyPremium"; songCount: number }
  | { kind: "spotifyFree"; songCount: number };

export interface LobbyRulesSummary {
  isCustom: boolean;
  starting: number;
  target: number;
  /** `null` while tokens are off; `seconds` is `null` for a Beat! window without a time limit. */
  tokens: { seconds: number | null } | null;
}

export interface LobbyPlayersStrip {
  hiddenCount: number;
  shown: PublicPlayerState[];
  total: number;
}

export interface LobbySetupModel {
  deckMeter: LobbyDeckMeter | null;
  hostName: string | null;
  isMusicDone: boolean;
  isInviteDone: boolean;
  music: LobbyMusicStatus;
  playersStrip: LobbyPlayersStrip;
  /** The room's stored code, or `null` until the room exists (never the route fallback). */
  roomCode: string | null;
  rules: LobbyRulesSummary;
  start: {
    isBlocked: boolean;
    note: LobbyStartNote | null;
    playerCount: number;
    reason: LobbyStartReason | null;
    songCount: number | null;
  };
  tracksToCheckCount: number;
}

/** The rules a new room starts with; "Reset to defaults" restores them. */
export const DEFAULT_RULES = {
  challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  revealConfirmMode: "host_only",
  startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
  targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  ttModeEnabled: DEFAULT_TT_MODE_ENABLED,
} as const satisfies Partial<PublicRoomSettings>;

/** Everything the lobby shows about readiness, derived in one place for both assemblies. */
export function selectLobbySetup(input: LobbySetupInput): LobbySetupModel {
  const { roomState, settings } = input;
  const players = roomState?.players ?? [];
  const hasDeck = settings.deckSource !== "none";
  const deckMeter = hasDeck ? selectDeckMeter(players, settings) : null;

  return {
    deckMeter,
    hostName: players.find((player) => player.isHost)?.displayName ?? null,
    isInviteDone: players.length >= 2,
    isMusicDone: hasDeck,
    music: selectMusicStatus(settings),
    playersStrip: selectPlayersStrip(players),
    roomCode: roomState?.roomId ?? null,
    rules: selectRulesSummary(settings),
    start: {
      isBlocked: selectStartReason(input) !== null,
      note: selectStartNote(players, settings, deckMeter),
      playerCount: players.length,
      reason: selectStartReason(input),
      songCount: hasDeck ? settings.importedTrackCount : null,
    },
    tracksToCheckCount: settings.deckSource === "spotify" ? settings.tracksToCheckCount : 0,
  };
}

export function selectStartReason({
  connectionStatus,
  roomState,
  settings,
  startGameActionStatus,
}: LobbySetupInput): LobbyStartReason | null {
  if (connectionStatus !== "connected") return { kind: "connection", status: connectionStatus };
  if (!roomState) return { kind: "creating" };
  if (settings.deckSource === "none") return { kind: "noDeck" };
  if (startGameActionStatus === "pending") return { kind: "pending" };
  if (startGameActionStatus === "retrying") return { kind: "retrying" };
  return null;
}

function selectStartNote(
  players: readonly PublicPlayerState[],
  settings: PublicRoomSettings,
  deckMeter: LobbyDeckMeter | null,
): LobbyStartNote | null {
  if (settings.deckSource === "spotify" && settings.spotifyAuthStatus !== "connected") {
    return { kind: "noAudio" };
  }
  if (deckMeter && !deckMeter.isEnough) return { kind: "shortDeck", meter: deckMeter };
  if (players.length === 1) return { kind: "solo" };
  return null;
}

export function selectDeckMeter(
  players: readonly PublicPlayerState[],
  settings: PublicRoomSettings,
): LobbyDeckMeter {
  // Before the room state arrives the host is the one player the deck has to serve.
  const startingCounts =
    players.length > 0
      ? players.map((player) => player.startingTimelineCardCount)
      : [settings.defaultStartingTimelineCardCount];
  const required = getRequiredDeckSize({
    startingTimelineCardCounts: startingCounts,
    targetTimelineCardCount: settings.targetTimelineCardCount,
  });

  return {
    current: settings.importedTrackCount,
    isEnough: settings.importedTrackCount >= required,
    playerCount: startingCounts.length,
    required,
    target: settings.targetTimelineCardCount,
  };
}

function selectMusicStatus(settings: PublicRoomSettings): LobbyMusicStatus {
  const songCount = settings.importedTrackCount;

  switch (settings.deckSource) {
    case "none":
      return { kind: "none" };
    case "practice":
      return { kind: "practice", songCount };
    case "spotify":
      if (settings.spotifyAuthStatus !== "connected") {
        return { kind: "spotifyUnconnected", songCount };
      }
      return settings.spotifyAccountType === "premium"
        ? { kind: "spotifyPremium", songCount }
        : { kind: "spotifyFree", songCount };
  }
}

export function selectRulesSummary(settings: PublicRoomSettings): LobbyRulesSummary {
  const isCustom = (Object.keys(DEFAULT_RULES) as (keyof typeof DEFAULT_RULES)[]).some(
    (key) => settings[key] !== DEFAULT_RULES[key],
  );

  return {
    isCustom,
    starting: settings.defaultStartingTimelineCardCount,
    target: settings.targetTimelineCardCount,
    tokens: settings.ttModeEnabled ? { seconds: settings.challengeWindowDurationSeconds } : null,
  };
}

export function selectPlayersStrip(players: readonly PublicPlayerState[]): LobbyPlayersStrip {
  if (players.length <= PLAYERS_STRIP_LIMIT) {
    return { hiddenCount: 0, shown: [...players], total: players.length };
  }

  return {
    hiddenCount: players.length - PLAYERS_STRIP_SHOWN_WHEN_FULL,
    shown: players.slice(0, PLAYERS_STRIP_SHOWN_WHEN_FULL),
    total: players.length,
  };
}
