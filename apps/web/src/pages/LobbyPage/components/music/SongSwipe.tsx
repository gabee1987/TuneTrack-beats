import type { ReactNode } from "react";
import { SwipeRow } from "../../../../features/motion";
import styles from "./songSwipe.module.css";

type SongSwipeProps = {
  children: ReactNode;
} & (
  | {
      /** A found song: right adds it to the game, left takes it out again; the row stays. */
      isInGame: boolean;
      onAdd: () => void;
      onRemoveFromGame: () => void;
    }
  | {
      /** A song of a deck or a quick pick: left deletes it from the list. */
      onDelete: () => void;
    }
);

/** The swipe of every song row (owner, 2026-10-16), the same in Find and in each list. */
export function SongSwipe(props: SongSwipeProps) {
  if ("onDelete" in props) {
    return (
      <SwipeRow className={styles.swipe} left={{ mark: <BinGlyph />, onSwipe: props.onDelete }}>
        {props.children}
      </SwipeRow>
    );
  }

  return (
    <SwipeRow
      className={styles.swipe}
      left={
        props.isInGame
          ? { keepsRow: true, mark: <BinGlyph />, onSwipe: props.onRemoveFromGame }
          : undefined
      }
      right={props.isInGame ? undefined : { mark: <PlusGlyph />, onSwipe: props.onAdd }}
    >
      {props.children}
    </SwipeRow>
  );
}

function BinGlyph() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={20}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={20}
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height={22} viewBox="0 0 24 24" width={22}>
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeLinecap="round" strokeWidth={2.4} />
    </svg>
  );
}
