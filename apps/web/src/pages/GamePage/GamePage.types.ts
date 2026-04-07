import type {
  PublicRoomState,
  TimelineCardPublic,
  TrackCardPublic,
} from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../features/preferences/uiPreferences";

export interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export interface TimelinePanelProps {
  title: string;
  hint: string;
  showHint: boolean;
  cardCount: number;
  canToggleView?: boolean;
  timelineView?: "active" | "mine";
  timelineCards: TimelineCardPublic[];
  onToggleTimelineView?: (view: "active" | "mine") => void;
  previewCard: TrackCardPublic | TimelineCardPublic | null;
  previewSlotIndex: number | null;
  selectable: boolean;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  originalChosenSlotIndex: number | null;
  challengerChosenSlotIndex: number | null;
  challengeMarkerTone?: "pending" | "success" | "failure";
  disabledSlotIndexes?: number[];
  hiddenCardMode: HiddenCardMode;
  showDevCardInfo: boolean;
  showDevAlbumInfo: boolean;
  showDevGenreInfo: boolean;
  showCorrectionPreview?: boolean;
  showCorrectPlacementPreview?: boolean;
  theme: ThemeId;
}

export interface GamePageController {
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
  challengeMarkerTone: "pending" | "success" | "failure";
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
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
  setTimelineView: (view: "active" | "mine") => void;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
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
  timelineView: "active" | "mine";
  updateViewPreferences: (nextView: {
    showMiniStandings?: boolean;
  }) => void;
  visibleChallengeChosenSlot: number | null;
  visibleOriginalChosenSlot: number | null;
  visiblePreviewCard: TrackCardPublic | TimelineCardPublic | null;
  visiblePreviewSlot: number | null;
  visibleTimelineCardCount: number;
  visibleTimelineCards: TimelineCardPublic[];
  visibleTimelineHint: string;
  visibleTimelineTitle: string;
  handleBuyTimelineCardWithTt: () => void;
  handleClaimChallenge: () => void;
  handleCloseRoom: () => void;
  handleConfirmReveal: () => void;
  handlePlaceCard: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  handleSkipTrackWithTt: () => void;
}
