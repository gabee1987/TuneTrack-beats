import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { memo } from "react";
import { useI18n } from "../../../features/i18n";
import { createLayoutTransition } from "../../../features/motion";
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
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const layoutTransition = createLayoutTransition(reduceMotion);
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
          {t("game.timeline.cardCount", {
            count: cardCount,
            plural: cardCount === 1 ? "" : "s",
          })}
        </span>
      </div>
      {canToggleView && onToggleTimelineView ? (
        <LayoutGroup id="timeline-view-switcher">
          <div className={styles.timelineViewSwitcherCompact}>
            <button
              className={styles.timelineViewCompactButton}
              data-active={timelineView === "active"}
              disabled={!canChangeTimelineView}
              onClick={() => onToggleTimelineView("active")}
              type="button"
            >
              {timelineView === "active" ? (
                <motion.span
                  className={styles.timelineViewCompactActivePill}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layoutId="timeline-view-active-pill"
                  transition={layoutTransition}
                >
                  <span className={styles.timelineViewCompactActiveGlow} />
                </motion.span>
              ) : null}
              <span className={styles.timelineViewCompactButtonLabel}>
                {t("game.timeline.active")}
              </span>
            </button>
            <button
              className={styles.timelineViewCompactButton}
              data-active={timelineView === "mine"}
              disabled={!canChangeTimelineView}
              onClick={() => onToggleTimelineView("mine")}
              ref={onMineButtonRef}
              type="button"
            >
              {timelineView === "mine" ? (
                <motion.span
                  className={styles.timelineViewCompactActivePill}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layoutId="timeline-view-active-pill"
                  transition={layoutTransition}
                >
                  <span className={styles.timelineViewCompactActiveGlow} />
                </motion.span>
              ) : null}
              <span className={styles.timelineViewCompactButtonLabel}>
                {t("game.timeline.mine")}
              </span>
            </button>
          </div>
        </LayoutGroup>
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
