import type {
  PublicRoomState,
  TimelineCardPublic,
  TrackCardPublic,
} from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import type {
  HiddenCardMode,
  ViewPreferences,
  ThemeId,
} from "../../features/preferences/uiPreferences";

export type TimelineView = "active" | "mine";

export type ChallengeMarkerTone = "pending" | "success" | "failure";

export type GamePageCard = TrackCardPublic | TimelineCardPublic;
export type GamePagePlayerNameResolver = (
  playerId: string | null | undefined,
) => string;
export type GamePageViewPreferenceUpdate = Partial<ViewPreferences>;
export type GamePageViewPreferenceUpdater = (
  nextView: GamePageViewPreferenceUpdate,
) => void;

export interface GamePageActionHandlers {
  handleBuyTimelineCardWithTt: () => void;
  handleClaimChallenge: () => void;
  handleCloseRoom: () => void;
  handleConfirmReveal: () => void;
  handlePlaceCard: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  handleSkipTrackWithTt: () => void;
}

export interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export interface TimelinePanelProps {
  title: string;
  hint: string;
  showHint: boolean;
  celebrationCard: GamePageCard | null;
  celebrationKey: string | null;
  celebrationMessage: string | null;
  cardCount: number;
  canChangeTimelineView?: boolean;
  canToggleView?: boolean;
  timelineView?: TimelineView;
  timelineCards: TimelineCardPublic[];
  onToggleTimelineView?: (view: TimelineView) => void;
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectable: boolean;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  originalChosenSlotIndex: number | null;
  challengerChosenSlotIndex: number | null;
  challengeMarkerTone?: ChallengeMarkerTone;
  disabledSlotIndexes?: number[];
  hiddenCardMode: HiddenCardMode;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevAlbumInfo: boolean;
  showDevGenreInfo: boolean;
  showCorrectionPreview?: boolean;
  showCorrectPlacementPreview?: boolean;
  theme: ThemeId;
}

export type GamePageController = GamePageActionHandlers & {
  canChangeTimelineView: boolean;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canSelectSlot: boolean;
  canToggleTimelineView: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  challengeSuccessCelebrationCard: GamePageCard | null;
  challengeSuccessCelebrationKey: string | null;
  challengeSuccessMessage: string | null;
  disabledTimelineSlots: number[];
  errorMessage: string | null;
  hiddenCardMode: HiddenCardMode;
  isHost: boolean;
  isViewingOwnTimeline: boolean;
  leadingPlayers: PublicRoomState["players"];
  menuTabs: AppShellMenuTab[];
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  setSelectedSlotIndex: (slotIndex: number) => void;
  setTimelineView: (view: TimelineView) => void;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevYearInfo: boolean;
  showDevGenreInfo: boolean;
  showHelperLabels: boolean;
  showMiniStandings: boolean;
  showPhaseChip: boolean;
  showRoomCodeChip: boolean;
  showTimelineHints: boolean;
  showTurnNumberChip: boolean;
  statusBadgeText: string;
  statusDetailText: string;
  theme: ThemeId;
  timelineView: TimelineView;
  updateViewPreferences: GamePageViewPreferenceUpdater;
  visibleChallengeChosenSlot: number | null;
  visibleOriginalChosenSlot: number | null;
  visiblePreviewCard: GamePageCard | null;
  visiblePreviewSlot: number | null;
  visibleTimelineCardCount: number;
  visibleTimelineCards: TimelineCardPublic[];
  visibleTimelineHint: string;
  visibleTimelineTitle: string;
};

export interface GamePageControllerExtras {
  canClaimChallenge: boolean;
  canResolveChallengeWindow: boolean;
  getPlayerName: GamePagePlayerNameResolver;
}

export type UseGamePageControllerResult = GamePageController &
  GamePageControllerExtras;
