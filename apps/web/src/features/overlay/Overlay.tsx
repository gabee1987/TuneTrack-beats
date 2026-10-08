import { m, useIsPresent, type TargetAndTransition, type Transition } from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useInRouterContext } from "react-router-dom";
import {
  MotionPresence,
  createDialogCardMotion,
  createFadeMotion,
  createStandardTransition,
  keepFadeOnMainThread,
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
  /**
   * Renders the scrim beside the panel inside this static layer instead of around it, for a
   * panel that fades itself: nested opacities multiply and leave the panel see-through.
   */
  layerClassName?: string | undefined;
  /** For a non-dismissible overlay: Back runs this instead of leaving the page. */
  onBack?: () => void;
  /** Runs after a close once the overlay's history entry is gone (see `overlayHistory`). */
  onClosed?: () => void;
  onDismiss: () => void;
  panelClassName?: string | undefined;
  panelMotion?: MotionTargets;
  panelTransition?: Transition;
  scrimClassName?: string | undefined;
  scrimMotion?: MotionTargets;
  scrimTransition?: Transition;
}

/**
 * The one way to open a dialog or sheet: the shared stack decides the layer, Escape, scrim
 * and Back close only the topmost entry, focus moves into the panel and returns to the
 * trigger, and the page behind does not scroll (plan 14 §4).
 */
export function Overlay(props: OverlayProps) {
  const isInRouter = useInRouterContext();
  const dismissible = props.dismissible ?? true;
  const hasHistoryEntry = isInRouter && (dismissible || props.onBack !== undefined);

  return hasHistoryEntry ? <HistoryOverlay {...props} /> : <PlainOverlay {...props} />;
}

function HistoryOverlay(props: OverlayProps) {
  const id = useId();
  const isDismissible = props.dismissible ?? true;
  const onBack = isDismissible || !props.onBack ? props.onDismiss : props.onBack;
  const hasEntry = useOverlayHistoryEntry(id, props.isOpen, onBack, props.onClosed);

  return <OverlayView {...props} id={id} isShown={props.isOpen && hasEntry} />;
}

function PlainOverlay(props: OverlayProps) {
  const id = useId();
  const { isOpen, onClosed } = props;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (wasOpen && !isOpen) {
      onClosedRef.current?.();
    }
  }, [isOpen]);

  return <OverlayView {...props} id={id} isShown={isOpen} />;
}

interface OverlayViewProps extends OverlayProps {
  id: string;
  isShown: boolean;
}

function OverlayView({
  children,
  dismissible = true,
  id,
  isShown,
  kind = "dialog",
  label,
  layerClassName,
  onDismiss,
  panelClassName,
  panelMotion,
  panelTransition,
  scrimClassName,
  scrimMotion,
  scrimTransition,
}: OverlayViewProps) {
  const reduceMotion = useReducedMotionPreference();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const layer = useSyncExternalStore(subscribeOverlayStack, () =>
    getOverlayLayer(getOverlayStack(), id),
  );

  useEffect(() => {
    if (!isShown) {
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
  }, [dismissible, id, isShown, kind]);

  const scrimProps = {
    animate: "animate",
    className: scrimClassName,
    exit: "exit",
    initial: "initial",
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      dismissTopOverlay(id);
    },
    onUpdate: keepFadeOnMainThread,
    role: "presentation",
    transition: scrimTransition ?? createStandardTransition(reduceMotion),
    variants: scrimMotion ?? createFadeMotion(reduceMotion),
  };
  const panel = (
    <m.div
      animate="animate"
      aria-label={label}
      aria-modal="true"
      className={panelClassName}
      exit="exit"
      initial="initial"
      onClick={(event) => event.stopPropagation()}
      onUpdate={keepFadeOnMainThread}
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
      transition={panelTransition ?? createStandardTransition(reduceMotion)}
      variants={panelMotion ?? createDialogCardMotion(reduceMotion)}
    >
      {children}
    </m.div>
  );

  // `initial`: an overlay first mounted already open (a lazy panel) still plays its entry.
  // `sync`: a reopen during the exit takes the layer back at once instead of queueing.
  return createPortal(
    <MotionPresence initial mode="sync">
      {isShown ? (
        <OverlayFrame
          key="frame"
          layer={layer}
          layerClassName={layerClassName}
          scrimProps={scrimProps}
        >
          {panel}
        </OverlayFrame>
      ) : null}
    </MotionPresence>,
    document.body,
  );
}

interface OverlayFrameProps {
  children: ReactNode;
  layer: string | undefined;
  layerClassName: string | undefined;
  scrimProps: ComponentProps<typeof m.div>;
}

/**
 * An exiting overlay stops taking input the moment it starts to close. Its fade only reaches
 * `opacity: 0`, which still receives taps, and an exit that never completes would leave an
 * invisible full-screen layer over the app (the B10 failure, generalised).
 */
function OverlayFrame({ children, layer, layerClassName, scrimProps }: OverlayFrameProps) {
  const isPresent = useIsPresent();
  const style = {
    ...(layer ? { zIndex: layer } : {}),
    ...(isPresent ? {} : { pointerEvents: "none" as const }),
  };

  return layerClassName ? (
    <div className={layerClassName} style={style}>
      <m.div {...scrimProps} />
      {children}
    </div>
  ) : (
    <m.div {...scrimProps} style={style}>
      {children}
    </m.div>
  );
}
