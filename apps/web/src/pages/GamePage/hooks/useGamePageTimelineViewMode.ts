import type { TimelineView } from "../GamePage.types";

interface UseGamePageTimelineViewModeOptions {
  canSelectChallengeSlot: boolean;
  showOwnTimeline: boolean;
  timelineView: TimelineView;
}

interface UseGamePageTimelineViewModeResult {
  canChangeTimelineView: boolean;
  canToggleTimelineView: boolean;
  isViewingOwnTimeline: boolean;
}

export function useGamePageTimelineViewMode({
  canSelectChallengeSlot,
  showOwnTimeline,
  timelineView,
}: UseGamePageTimelineViewModeOptions): UseGamePageTimelineViewModeResult {
  const canToggleTimelineView = showOwnTimeline;

  return {
    canChangeTimelineView: showOwnTimeline && !canSelectChallengeSlot,
    canToggleTimelineView,
    isViewingOwnTimeline: canToggleTimelineView && timelineView === "mine",
  };
}
