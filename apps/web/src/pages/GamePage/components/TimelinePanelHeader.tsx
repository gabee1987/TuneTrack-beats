import { memo } from "react";
import type { TimelinePanelHeaderModel } from "../GamePage.types";
import styles from "./TimelinePanel.module.css";

interface TimelinePanelHeaderProps {
  model: TimelinePanelHeaderModel;
  onMineButtonRef: (node: HTMLButtonElement | null) => void;
}

function TimelinePanelHeaderComponent({
  model,
  onMineButtonRef,
}: TimelinePanelHeaderProps) {
  const {
    canChangeTimelineView = true,
    canToggleView = false,
    cardCount,
    onToggleTimelineView,
    timelineView = "active",
    title,
  } = model;

  return (
    <div className={styles.timelineHeader}>
      <div className={styles.timelineHeaderCopy}>
        <h2 className={styles.timelineHeading}>{title}</h2>
        <span className={styles.timelineCountSeparator}>/</span>
        <span className={styles.timelineCount}>
          {cardCount} card{cardCount === 1 ? "" : "s"}
        </span>
      </div>
      {canToggleView && onToggleTimelineView ? (
        <div className={styles.timelineViewSwitcherCompact}>
          <button
            className={`${styles.timelineViewCompactButton} ${
              timelineView === "active"
                ? styles.timelineViewCompactButtonActive
                : ""
            }`}
            data-active={timelineView === "active"}
            disabled={!canChangeTimelineView}
            onClick={() => onToggleTimelineView("active")}
            type="button"
          >
            Active
          </button>
          <button
            className={`${styles.timelineViewCompactButton} ${
              timelineView === "mine"
                ? styles.timelineViewCompactButtonActive
                : ""
            }`}
            data-active={timelineView === "mine"}
            disabled={!canChangeTimelineView}
            onClick={() => onToggleTimelineView("mine")}
            ref={onMineButtonRef}
            type="button"
          >
            Mine
          </button>
        </div>
      ) : null}
    </div>
  );
}

function areTimelineHeaderModelsEqual(
  previousModel: TimelinePanelHeaderModel,
  nextModel: TimelinePanelHeaderModel,
): boolean {
  return (
    previousModel.canChangeTimelineView === nextModel.canChangeTimelineView &&
    previousModel.canToggleView === nextModel.canToggleView &&
    previousModel.cardCount === nextModel.cardCount &&
    previousModel.onToggleTimelineView === nextModel.onToggleTimelineView &&
    previousModel.timelineView === nextModel.timelineView &&
    previousModel.title === nextModel.title
  );
}

export const TimelinePanelHeader = memo(
  TimelinePanelHeaderComponent,
  (previousProps, nextProps) =>
    previousProps.onMineButtonRef === nextProps.onMineButtonRef &&
    areTimelineHeaderModelsEqual(previousProps.model, nextProps.model),
);
