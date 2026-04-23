import {
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomState,
} from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import {
  createMenuTokenAdjustFlyoutPopTransition,
  createMenuTokenAdjustFlyoutPopVariants,
  createMenuTokenAdjustFlyoutTransition,
  createMenuTokenAdjustFlyoutVariants,
} from "../../features/motion";
import type { AppShellMenuTab } from "../../features/app-shell/AppShellMenu";
import { Badge } from "../../features/ui/Badge";
import { TtTokenAmount, TtTokenIcon } from "../../features/ui/TtToken";
import styles from "./GamePage.module.css";

interface CreateGameMenuTabsOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState;
  onAwardTt: (playerId: string) => void;
  onRemoveTt: (playerId: string) => void;
}

type TokenFlyAnimation = "add" | "remove" | null;
interface TokenFlyState {
  direction: Exclude<TokenFlyAnimation, null>;
  originX: number;
  originY: number;
  key: number;
}

interface TokenAdjustButtonsProps {
  currentTokenCount: number;
  onAwardTt: () => void;
  onRemoveTt: () => void;
}

function TokenAdjustButtons({
  currentTokenCount,
  onAwardTt,
  onRemoveTt,
}: TokenAdjustButtonsProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const animationKeyRef = useRef(0);
  const tokenActionsRef = useRef<HTMLDivElement | null>(null);
  const addButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const removeButtonContentRef = useRef<HTMLSpanElement | null>(null);
  const [flyAnimations, setFlyAnimations] = useState<TokenFlyState[]>([]);
  const canAddToken = currentTokenCount < MAX_STARTING_TT_TOKEN_COUNT;
  const canRemoveToken = currentTokenCount > MIN_STARTING_TT_TOKEN_COUNT;

  function getFlyAnimationOrigin(direction: Exclude<TokenFlyAnimation, null>) {
    const actionsElement = tokenActionsRef.current;
    const sourceElement =
      direction === "add" ? addButtonContentRef.current : removeButtonContentRef.current;
    if (!actionsElement) {
      return {
        originX: direction === "add" ? 0 : 0,
        originY: 0,
      };
    }
    if (!sourceElement) {
      return {
        originX:
          direction === "add"
            ? actionsElement.clientWidth * 0.25
            : actionsElement.clientWidth * 0.75,
        originY: actionsElement.clientHeight * 0.5,
      };
    }

    const actionsBounds = actionsElement.getBoundingClientRect();
    const sourceBounds = sourceElement.getBoundingClientRect();
    return {
      originX: sourceBounds.left - actionsBounds.left + sourceBounds.width / 2,
      originY: sourceBounds.top - actionsBounds.top + sourceBounds.height / 2,
    };
  }

  function triggerFlyAnimation(direction: Exclude<TokenFlyAnimation, null>) {
    animationKeyRef.current += 1;
    const { originX, originY } = getFlyAnimationOrigin(direction);
    const nextFlyAnimation: TokenFlyState = {
      direction,
      originX,
      originY,
      key: animationKeyRef.current,
    };
    setFlyAnimations((currentAnimations) => [
      ...currentAnimations,
      nextFlyAnimation,
    ]);
  }

  function clearFlyAnimation(animationKey: number) {
    setFlyAnimations((currentAnimations) =>
      currentAnimations.filter((animation) => animation.key !== animationKey),
    );
  }

  return (
    <div className={styles.menuTokenActions} ref={tokenActionsRef}>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonAdd}`}
        disabled={!canAddToken}
        onClick={() => {
          if (!canAddToken) {
            return;
          }
          onAwardTt();
          triggerFlyAnimation("add");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={addButtonContentRef}>
          +1<TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      <button
        className={`${styles.menuActionButton} ${styles.menuActionButtonRemove}`}
        disabled={!canRemoveToken}
        onClick={() => {
          if (!canRemoveToken) {
            return;
          }
          onRemoveTt();
          triggerFlyAnimation("remove");
        }}
        type="button"
      >
        <span className={styles.menuTokenActionContent} ref={removeButtonContentRef}>
          -1<TtTokenIcon className={styles.menuTokenIcon} />
        </span>
      </button>
      {flyAnimations.map((flyAnimation) => (
        <span
          className={styles.menuTokenFlyoutAnchor}
          key={flyAnimation.key}
          style={{ left: flyAnimation.originX, top: flyAnimation.originY }}
        >
          <motion.span
            animate="animate"
            className={`${styles.menuTokenFlyout} ${
              flyAnimation.direction === "add"
                ? styles.menuTokenFlyoutAdd
                : styles.menuTokenFlyoutRemove
            }`}
            initial="initial"
            onAnimationComplete={() => clearFlyAnimation(flyAnimation.key)}
            transition={createMenuTokenAdjustFlyoutTransition(reduceMotion)}
            variants={createMenuTokenAdjustFlyoutVariants(
              reduceMotion,
              flyAnimation.direction,
            )}
          >
            <motion.span
              animate="animate"
              className={styles.menuTokenFlyoutContent}
              initial="initial"
              transition={createMenuTokenAdjustFlyoutPopTransition(reduceMotion)}
              variants={createMenuTokenAdjustFlyoutPopVariants(reduceMotion)}
            >
              {flyAnimation.direction === "add" ? "+1" : "-1"}
              <TtTokenIcon className={styles.menuTokenFlyoutIcon} />
            </motion.span>
          </motion.span>
        </span>
      ))}
    </div>
  );
}

export function createGameMenuTabs({
  currentPlayerId,
  roomState,
  onAwardTt,
  onRemoveTt,
}: CreateGameMenuTabsOptions): AppShellMenuTab[] {
  return [
    {
      id: "players",
      label: "Players",
      content: (
        <div className={styles.menuInfoSection}>
          <h3 className={styles.menuInfoTitle}>Players summary</h3>
          <ul className={styles.menuPlayerList}>
            {roomState.players.map((player) => (
              <li className={styles.menuPlayerItem} key={player.id}>
                <div className={styles.menuPlayerInfoRow}>
                  <div className={styles.menuPlayerIdentity}>
                    <div className={styles.menuPlayerNameRow}>
                      <strong className={styles.menuPlayerName}>
                        {player.id === currentPlayerId ? "You" : player.displayName}
                      </strong>
                      <div className={styles.menuPlayerBadges}>
                        <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                          {roomState.timelines[player.id]?.length ?? 0} cards
                        </Badge>
                        {roomState.settings.ttModeEnabled ? (
                          <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                            <TtTokenAmount amount={player.ttTokenCount} />
                          </Badge>
                        ) : null}
                        {player.isHost ? (
                          <Badge className={styles.menuPlayerBadge} size="sm" variant="strong">
                            Host
                          </Badge>
                        ) : null}
                        {player.id === roomState.turn?.activePlayerId ? (
                          <Badge
                            className={styles.menuPlayerBadge}
                            size="sm"
                            variant="mutedSurface"
                          >
                            Turn
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                {roomState.settings.ttModeEnabled &&
                roomState.hostId === currentPlayerId ? (
                  <TokenAdjustButtons
                    currentTokenCount={player.ttTokenCount}
                    onAwardTt={() => onAwardTt(player.id)}
                    onRemoveTt={() => onRemoveTt(player.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "view",
      label: "View",
      content: (
        <p className={styles.menuPlaceholder}>
          Timeline visibility preferences now live inside the shared menu shell.
        </p>
      ),
    },
    {
      id: "settings",
      label: "Theme",
      content: (
        <p className={styles.menuPlaceholder}>
          Theme and hidden-card preferences are available here while the final
          game shell is being built.
        </p>
      ),
    },
    ...(roomState.hostId === currentPlayerId
      ? [
          {
            id: "dev" as const,
            label: "Diagnostics",
            content: (
              <p className={styles.menuPlaceholder}>
                Developer-only current-card helpers will move into this tab as
                the main game surface gets cleaned up.
              </p>
            ),
          },
        ]
      : []),
  ];
}
