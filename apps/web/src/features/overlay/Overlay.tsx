import { m, type TargetAndTransition, type Transition } from "framer-motion";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInRouterContext } from "react-router-dom";
import {
  MotionPresence,
  createDialogCardMotion,
  createFadeMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../motion";
import { useOverlayHistoryEntry } from "./overlayHistory";
import { getOverlayLayer, type OverlayKind } from "./overlayStack";
import {
  dismissTopOverlay,
  getOverlayStack,
  registerOverlay,
  subscribeOverlayStack,
} from "./overlayStore";

type MotionTargets = Record<"initial" | "animate" | "exit", TargetAndTransition>;

export interface OverlayProps {
  children: ReactNode;
  /** `false` ignores Escape, scrim taps and Back; the caller offers its own way out. */
  dismissible?: boolean;
  isOpen: boolean;
  kind?: OverlayKind;
  label: string;
  onDismiss: () => void;
  panelClassName?: string | undefined;
  panelMotion?: MotionTargets;
  panelTransition?: Transition;
  scrimClassName?: string | undefined;
  scrimTransition?: Transition;
}

/**
 * The one way to open a dialog or sheet: the shared stack decides the layer, Escape, scrim
 * and Back close only the topmost entry, focus moves into the panel and returns to the
 * trigger, and the page behind does not scroll (plan 14 §4).
 */
export function Overlay({
  children,
  dismissible = true,
  isOpen,
  kind = "dialog",
  label,
  onDismiss,
  panelClassName,
  panelMotion,
  panelTransition,
  scrimClassName,
  scrimTransition,
}: OverlayProps) {
  const id = useId();
  const reduceMotion = useReducedMotionPreference();
  const isInRouter = useInRouterContext();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const layer = useSyncExternalStore(subscribeOverlayStack, () =>
    getOverlayLayer(getOverlayStack(), id),
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const trigger = document.activeElement;
    const unregister = registerOverlay({
      dismiss: () => onDismissRef.current(),
      dismissible,
      getPanel: () => panelRef.current,
      id,
      kind,
    });
    panelRef.current?.focus({ preventScroll: true });

    return () => {
      unregister();

      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [dismissible, id, isOpen, kind]);

  const content = (
    <MotionPresence>
      {isOpen ? (
        <m.div
          animate="animate"
          className={scrimClassName}
          exit="exit"
          initial="initial"
          onClick={(event) => {
            event.stopPropagation();
            dismissTopOverlay(id);
          }}
          role="presentation"
          {...(layer ? { style: { zIndex: layer } } : {})}
          transition={scrimTransition ?? createStandardTransition(reduceMotion)}
          variants={createFadeMotion(reduceMotion)}
        >
          <m.div
            animate="animate"
            aria-label={label}
            aria-modal="true"
            className={panelClassName}
            exit="exit"
            initial="initial"
            onClick={(event) => event.stopPropagation()}
            ref={panelRef}
            role="dialog"
            tabIndex={-1}
            transition={panelTransition ?? createStandardTransition(reduceMotion)}
            variants={panelMotion ?? createDialogCardMotion(reduceMotion)}
          >
            {children}
          </m.div>
        </m.div>
      ) : null}
    </MotionPresence>
  );

  return (
    <>
      {createPortal(content, document.body)}
      {isInRouter && dismissible ? (
        <OverlayHistoryEntry id={id} isOpen={isOpen} onDismiss={onDismiss} />
      ) : null}
    </>
  );
}

interface OverlayHistoryEntryProps {
  id: string;
  isOpen: boolean;
  onDismiss: () => void;
}

function OverlayHistoryEntry({ id, isOpen, onDismiss }: OverlayHistoryEntryProps) {
  useOverlayHistoryEntry(id, isOpen, onDismiss);
  return null;
}
