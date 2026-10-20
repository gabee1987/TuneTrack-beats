import type { TimelineCardPublic } from "@tunetrack/shared/client";
import type {
  HiddenCardMode,
  RevealedCardMode,
  ThemeId,
} from "../../features/preferences/uiPreferences";
import type { GamePageCard, TimelineView } from "./GamePage.types";
import type {
  PreviewCardTransitionEvent,
  TimelineCelebrationTransitionEvent,
  TimelinePreviewTransitionEvent,
} from "./gamePageTransitionEvents";

export type ChallengeMarkerTone = "pending" | "success" | "failure";
export type TimelineCelebrationTone = "success" | "failure";

export interface TimelinePanelHeaderModel {
  canChangeTimelineView?: boolean;
  canToggleView?: boolean;
  cardCount: number;
  onToggleTimelineView?: (view: TimelineView) => void;
  timelineView?: TimelineView;
  title: string;
}

export interface TimelinePanelInteractionModel {
  challengeMarkerTone?: ChallengeMarkerTone;
  challengerChosenSlotIndex: number | null;
  disabledSlotIndexes?: number[];
  onSelectSlot: (slotIndex: number) => void;
  originalChosenSlotIndex: number | null;
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectable: boolean;
  selectedSlotIndex: number;
}

export interface TimelinePanelRenderModel {
  hiddenCardMode: HiddenCardMode;
  revealedCardMode: RevealedCardMode;
  hint: string;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  timelinePreviewTransitionEvent: TimelinePreviewTransitionEvent | null;
  timelineCelebrationTransitionEvent: TimelineCelebrationTransitionEvent | null;
  showCorrectPlacementPreview?: boolean;
  showCorrectionPreview?: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  showHint: boolean;
  isOwnTimeline: boolean;
  theme: ThemeId;
  timelineCards: TimelineCardPublic[];
  timelineView?: TimelineView;
}

export interface TimelinePanelModel {
  header: TimelinePanelHeaderModel;
  interaction: TimelinePanelInteractionModel;
  render: TimelinePanelRenderModel;
}

export interface TimelinePanelItemsModel {
  challengeMarkerTone: ChallengeMarkerTone;
  challengerChosenSlotIndex: number | null;
  disabledSlotIndexes: number[];
  hiddenCardMode: HiddenCardMode;
  revealedCardMode: RevealedCardMode;
  originalChosenSlotIndex: number | null;
  previewCardTransitionEvent: PreviewCardTransitionEvent | null;
  selectable: boolean;
  shouldAnimateCorrectPlacement?: boolean;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  theme: ThemeId;
}

export interface TimelinePanelDragModel {
  previewCard: GamePageCard | null;
  previewSlotIndex: number | null;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  timelineCards: TimelineCardPublic[];
}
