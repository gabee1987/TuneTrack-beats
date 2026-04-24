import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
import {
  createTimelineFlyAnimationVariants,
  createTimelineFlyAnimationTransition,
} from "../../../features/motion";
import type { GamePageCard } from "../GamePage.types";
import { PreviewCard } from "./PreviewCard";
import styles from "./TimelinePanel.module.css";

interface TimelinePanelFlyAnimationProps {
  flyAnimationState:
    | {
        card: GamePageCard;
        sourceRect: DOMRect;
        targetRect: DOMRect;
      }
    | null;
  showDevAlbumInfo: boolean;
  showDevGenreInfo: boolean;
  theme: ThemeId;
}

export function TimelinePanelFlyAnimation({
  flyAnimationState,
  showDevAlbumInfo,
  showDevGenreInfo,
  theme,
}: TimelinePanelFlyAnimationProps) {
  const reduceMotion = useReducedMotion() ?? false;

  if (typeof document === "undefined" || !flyAnimationState) {
    return null;
  }

  const deltaX =
    flyAnimationState.targetRect.left +
    flyAnimationState.targetRect.width / 2 -
    (flyAnimationState.sourceRect.left +
      flyAnimationState.sourceRect.width / 2);
  const deltaY =
    flyAnimationState.targetRect.top +
    flyAnimationState.targetRect.height / 2 -
    (flyAnimationState.sourceRect.top +
      flyAnimationState.sourceRect.height / 2);
  const flyVariants = createTimelineFlyAnimationVariants(reduceMotion, deltaX, deltaY);

  return createPortal(
    <motion.div
      animate="animate"
      className={styles.flyToMineCard}
      initial="initial"
      style={{
        height: flyAnimationState.sourceRect.height,
        left: flyAnimationState.sourceRect.left,
        top: flyAnimationState.sourceRect.top,
        width: flyAnimationState.sourceRect.width,
      }}
      transition={createTimelineFlyAnimationTransition(reduceMotion)}
      variants={flyVariants}
    >
      <PreviewCard
        hiddenCardMode={"gradient" as HiddenCardMode}
        isChallengeSlot={false}
        isGhosted={false}
        isOriginalSlot={false}
        previewCard={flyAnimationState.card}
        selectable={false}
        showDevAlbumInfo={showDevAlbumInfo}
        showDevCardInfo={true}
        showDevGenreInfo={showDevGenreInfo}
        showDevYearInfo={true}
        showRevealedContent={true}
        theme={theme}
        tone="success"
        transitionEvent={null}
      />
    </motion.div>,
    document.body,
  );
}
