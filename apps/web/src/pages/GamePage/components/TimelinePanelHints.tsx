import { FirstRunHint } from "../../../features/hints/FirstRunHint";

interface TimelinePanelHintsProps {
  canToggleView: boolean;
  hasPreviewCard: boolean;
  isOwnTimeline: boolean;
  isSelectable: boolean;
  previewAnchor: HTMLElement | null;
  timelineCardAnchor: HTMLElement | null;
  timelineCardCount: number;
  timelineSwitchAnchor: HTMLElement | null;
}

/** First-run hints for dragging the new card, tapping a placed card and switching timelines. */
export function TimelinePanelHints({
  canToggleView,
  hasPreviewCard,
  isOwnTimeline,
  isSelectable,
  previewAnchor,
  timelineCardAnchor,
  timelineCardCount,
  timelineSwitchAnchor,
}: TimelinePanelHintsProps) {
  return (
    <>
      <FirstRunHint
        anchor={previewAnchor}
        id="game-drag-preview"
        isEligible={isOwnTimeline && isSelectable && hasPreviewCard}
      />
      <FirstRunHint
        anchor={timelineCardAnchor}
        id="game-timeline-tap"
        isEligible={isOwnTimeline && timelineCardCount > 0 && !hasPreviewCard}
      />
      <FirstRunHint
        anchor={timelineSwitchAnchor}
        id="game-timeline-switch"
        isEligible={canToggleView}
      />
    </>
  );
}
