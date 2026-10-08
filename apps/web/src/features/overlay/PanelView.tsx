import { m, useIsPresent } from "framer-motion";
import { useContext, useId, useRef, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInRouterContext } from "react-router-dom";
import {
  MotionPresence,
  createSideSheetMotion,
  keepFadeOnMainThread,
  useReducedMotionPreference,
} from "../motion";
import { useOverlayHistoryEntry } from "./overlayHistory";
import { PanelViewHostContext, useOverlayRegistration } from "./overlayRegistration";
import styles from "./PanelView.module.css";

export interface PanelViewProps {
  children: ReactNode;
  className?: string | undefined;
  isOpen: boolean;
  label: string;
  onDismiss: () => void;
}

/**
 * A deeper step inside an open panel (the playlist editor or song editor inside Music Setup):
 * it slides in over the panel's content instead of stacking another sheet and scrim on top,
 * which flickered (owner decision 2026-10-08). Back, Escape and a scrim tap close one step,
 * focus stays inside it, and it takes the side-sheet motion.
 */
export function PanelView(props: PanelViewProps) {
  const isInRouter = useInRouterContext();

  return isInRouter ? <HistoryPanelView {...props} /> : <PanelViewBody {...props} />;
}

function HistoryPanelView(props: PanelViewProps) {
  const id = useId();
  const hasEntry = useOverlayHistoryEntry(id, props.isOpen, props.onDismiss);

  return <PanelViewContent {...props} id={id} isShown={props.isOpen && hasEntry} />;
}

function PanelViewBody(props: PanelViewProps) {
  const id = useId();

  return <PanelViewContent {...props} id={id} isShown={props.isOpen} />;
}

interface PanelViewContentProps extends PanelViewProps {
  id: string;
  isShown: boolean;
}

function PanelViewContent({
  children,
  className,
  id,
  isShown,
  label,
  onDismiss,
}: PanelViewContentProps) {
  const host = useContext(PanelViewHostContext);
  const viewRef = useRef<HTMLDivElement | null>(null);

  useOverlayRegistration({
    dismissible: true,
    id,
    isShown,
    kind: "view",
    onDismiss,
    panelRef: viewRef,
  });

  const content = (
    <MotionPresence initial mode="sync">
      {isShown ? (
        <PanelViewFrame className={className} key="view" label={label} viewRef={viewRef}>
          {children}
        </PanelViewFrame>
      ) : null}
    </MotionPresence>
  );

  // Rendered into the panel itself, so a view opened from deep inside the panel's scrolling
  // content still covers the whole panel.
  return host ? createPortal(content, host) : content;
}

interface PanelViewFrameProps {
  children: ReactNode;
  className: string | undefined;
  label: string;
  viewRef: MutableRefObject<HTMLDivElement | null>;
}

function PanelViewFrame({ children, className, label, viewRef }: PanelViewFrameProps) {
  const reduceMotion = useReducedMotionPreference();
  const isPresent = useIsPresent();

  return (
    <m.div
      animate="animate"
      aria-label={label}
      aria-modal="true"
      className={className ? `${styles.view} ${className}` : styles.view}
      exit="exit"
      initial="initial"
      onUpdate={keepFadeOnMainThread}
      ref={viewRef}
      role="dialog"
      // A closing view stops taking input at once, like a closing overlay.
      style={isPresent ? {} : { pointerEvents: "none" }}
      tabIndex={-1}
      variants={createSideSheetMotion(reduceMotion)}
    >
      {children}
    </m.div>
  );
}
