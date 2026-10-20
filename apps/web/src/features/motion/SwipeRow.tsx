import { animate, m, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./SwipeRow.module.css";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

const SWIPE_THRESHOLD_PX = 68;
const SWIPE_REVEAL_WIDTH_PX = 132;
const EXIT_EASE = [0.4, 0, 1, 1] as const;
const ADD_EASE = [0.2, 0, 0, 1] as const;
const SETTLE_SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;
// A move this far decides between a swipe and a scroll; past the reveal the row resists.
const SWIPE_SLOP_PX = 8;
const SWIPE_ELASTIC = 0.18;

interface SwipeGesture {
  isSwiping: boolean;
  pointerId: number;
  startX: number;
  startY: number;
}

export interface SwipeAction {
  /** Shown in the zone the swipe uncovers: a plus, a bin. */
  mark: ReactNode;
  onSwipe: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  className?: string | undefined;
  /** Swipe left: the row slides out. A removed row goes; one that stays (`keepsRow`) returns. */
  left?: (SwipeAction & { keepsRow?: boolean | undefined }) | undefined;
  /** Swipe right, as Spotify adds to the queue: the green zone opens, the row springs back. */
  right?: SwipeAction | undefined;
}

/**
 * A song row the host swipes (owner, 2026-10-16): right adds it, left removes it. Short of the
 * threshold the row springs back. Plain pointer events drive the row, so a tap stays a tap,
 * an upward move scrolls the list, and no drag feature is loaded: framer's `drag` kept a
 * removed row's list from ever finishing its exit.
 */
export function SwipeRow({ children, className, left, right }: SwipeRowProps) {
  const reduceMotion = useReducedMotionPreference();
  const x = useMotionValue(0);
  const rightWidth = useMotionValue(0);
  const leftWidth = useMotionValue(0);
  const leftOpacity = useMotionValue(1);
  const isActing = useRef(false);
  const gesture = useRef<SwipeGesture | null>(null);
  const isClickSwallowed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return x.on("change", (value) => {
      if (isActing.current) return;
      rightWidth.set(Math.max(0, value));
      leftWidth.set(Math.max(0, -value));
    });
  }, [leftWidth, rightWidth, x]);

  const timed = (seconds: number, ease: typeof EXIT_EASE | typeof ADD_EASE) => ({
    duration: reduceMotion ? 0 : seconds,
    ease,
  });
  const settle = () => animate(x, 0, reduceMotion ? { duration: 0 } : SETTLE_SPRING);

  function follow(offset: number) {
    const limit = (offset > 0 ? right : left) ? SWIPE_REVEAL_WIDTH_PX : 0;
    const distance = Math.abs(offset);
    const shown = distance <= limit ? distance : limit + (distance - limit) * SWIPE_ELASTIC;
    x.set(limit === 0 ? 0 : Math.sign(offset) * shown);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    isClickSwallowed.current = false;
    if (isActing.current || event.button !== 0) return;
    gesture.current = {
      isSwiping: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const offsetX = event.clientX - current.startX;
    const offsetY = event.clientY - current.startY;
    if (!current.isSwiping) {
      if (Math.abs(offsetY) > SWIPE_SLOP_PX && Math.abs(offsetY) >= Math.abs(offsetX)) {
        gesture.current = null;
        return;
      }
      if (Math.abs(offsetX) <= SWIPE_SLOP_PX) return;
      current.isSwiping = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    follow(offsetX);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.isSwiping || current.pointerId !== event.pointerId) return;
    isClickSwallowed.current = true;
    void finish(event.clientX - current.startX);
  }

  function handlePointerCancel() {
    if (gesture.current?.isSwiping) void settle();
    gesture.current = null;
  }

  async function finish(offset: number) {
    isActing.current = true;

    if (right && offset > SWIPE_THRESHOLD_PX) {
      await animate(x, SWIPE_REVEAL_WIDTH_PX, timed(0.14, ADD_EASE));
      right.onSwipe();
      await settle();
      rightWidth.set(0);
    } else if (left && offset < -SWIPE_THRESHOLD_PX) {
      const rowWidth = rowRef.current?.getBoundingClientRect().width ?? SWIPE_REVEAL_WIDTH_PX;
      await Promise.all([
        animate(x, -rowWidth, timed(0.22, EXIT_EASE)),
        animate(leftWidth, rowWidth, timed(0.22, EXIT_EASE)),
      ]);
      if (!left.keepsRow) await animate(leftOpacity, 0, timed(0.1, EXIT_EASE));
      left.onSwipe();
      if (left.keepsRow) {
        await settle();
        leftWidth.set(0);
      }
    } else {
      await settle();
    }

    isActing.current = false;
  }

  return (
    <div className={className ? `${styles.swipe} ${className}` : styles.swipe} ref={rowRef}>
      {right ? <SwipeZone mark={right.mark} side="right" width={rightWidth} /> : null}
      {left ? (
        <SwipeZone mark={left.mark} opacity={leftOpacity} side="left" width={leftWidth} />
      ) : null}
      <m.div
        className={styles.row}
        data-swipe-row=""
        // The click that ends a swipe is not a tap on the row.
        onClickCapture={(event) => {
          if (!isClickSwallowed.current) return;
          isClickSwallowed.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ x }}
      >
        {children}
      </m.div>
    </div>
  );
}

interface SwipeZoneProps {
  mark: ReactNode;
  opacity?: MotionValue<number> | undefined;
  side: "left" | "right";
  width: MotionValue<number>;
}

function SwipeZone({ mark, opacity, side, width }: SwipeZoneProps) {
  const markOpacity = useTransform(width, [0, 40, SWIPE_REVEAL_WIDTH_PX], [0, 0, 1]);
  const markScale = useTransform(width, [40, SWIPE_REVEAL_WIDTH_PX], [0.6, 1]);

  return (
    <m.div
      aria-hidden="true"
      className={`${styles.zone} ${styles[side]}`}
      style={opacity ? { opacity, width } : { width }}
    >
      <m.span className={styles.mark} style={{ opacity: markOpacity, scale: markScale }}>
        {mark}
      </m.span>
    </m.div>
  );
}
