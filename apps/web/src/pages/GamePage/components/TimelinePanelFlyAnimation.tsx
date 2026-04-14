import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type {
  HiddenCardMode,
  ThemeId,
} from "../../../features/preferences/uiPreferences";
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
  if (typeof document === "undefined" || !flyAnimationState) {
    return null;
  }

  return createPortal(
    <motion.div
      animate={{
        opacity: 0,
        scale: 0.2,
        x:
          flyAnimationState.targetRect.left +
          flyAnimationState.targetRect.width / 2 -
          (flyAnimationState.sourceRect.left +
            flyAnimationState.sourceRect.width / 2),
        y:
          flyAnimationState.targetRect.top +
          flyAnimationState.targetRect.height / 2 -
          (flyAnimationState.sourceRect.top +
            flyAnimationState.sourceRect.height / 2),
      }}
      className={styles.flyToMineCard}
      initial={{
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
      }}
      style={{
        height: flyAnimationState.sourceRect.height,
        left: flyAnimationState.sourceRect.left,
        top: flyAnimationState.sourceRect.top,
        width: flyAnimationState.sourceRect.width,
      }}
      transition={{
        duration: 0.82,
        ease: [0.18, 0.84, 0.24, 1],
      }}
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
      />
    </motion.div>,
    document.body,
  );
}
