import type { TimelineView } from "../GamePage.types";
import styles from "./TimelinePanel.module.css";

interface TimelinePanelHeaderProps {
  canChangeTimelineView: boolean;
  canToggleView: boolean;
  cardCount: number;
  onMineButtonRef: (node: HTMLButtonElement | null) => void;
  onToggleTimelineView: ((view: TimelineView) => void) | undefined;
  timelineView: TimelineView;
  title: string;
}

export function TimelinePanelHeader({
  canChangeTimelineView,
  canToggleView,
  cardCount,
  onMineButtonRef,
  onToggleTimelineView,
  timelineView,
  title,
}: TimelinePanelHeaderProps) {
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
