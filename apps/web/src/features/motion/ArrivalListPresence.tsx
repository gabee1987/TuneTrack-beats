import { m } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { MotionPresence } from "./MotionPresence";
import { createPlayerArrivalMotion } from "./startupFlowMotionTokens";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

export interface ArrivalListItem {
  content: ReactNode;
  key: string;
}

interface ArrivalListPresenceProps {
  "aria-label"?: string | undefined;
  className?: string | undefined;
  itemClassName?: string | undefined;
  items: readonly ArrivalListItem[];
}

/**
 * A list whose items arrive and leave with `createPlayerArrivalMotion`: items already there on
 * mount stay still, and several arriving together enter one after another.
 */
export function ArrivalListPresence({
  "aria-label": ariaLabel,
  className,
  itemClassName,
  items,
}: ArrivalListPresenceProps) {
  const reduceMotion = useReducedMotionPreference();
  const variants = createPlayerArrivalMotion(reduceMotion);
  const knownKeysRef = useRef<ReadonlySet<string> | null>(null);
  const knownKeys = knownKeysRef.current;
  const arrivingKeys = knownKeys ? items.filter((item) => !knownKeys.has(item.key)) : [];

  useEffect(() => {
    knownKeysRef.current = new Set(items.map((item) => item.key));
  });

  return (
    <ul aria-label={ariaLabel} className={className}>
      <MotionPresence initial={false} mode="sync">
        {items.map((item) => (
          <m.li
            animate="animate"
            className={itemClassName}
            custom={Math.max(arrivingKeys.indexOf(item), 0)}
            exit="exit"
            initial="initial"
            key={item.key}
            variants={variants}
          >
            {item.content}
          </m.li>
        ))}
      </MotionPresence>
    </ul>
  );
}
