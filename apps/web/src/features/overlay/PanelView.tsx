import { m, useIsPresent } from "framer-motion";
import {
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
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
  // In one pane of a panel, the rest of the panel stays in reach of Tab and the wheel.
  const isInPane = host.element !== host.panel;

  useOverlayRegistration({
    dismissible: true,
    id,
    isShown,
    kind: "view",
    onDismiss,
    panelRef: viewRef,
    scope: isInPane ? host.panel : null,
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
  return host.element ? createPortal(content, host.element) : content;
}

interface PanelViewPaneProps {
  /** The content whose `PanelView`s open in the pane instead of over the whole panel. */
  children: ReactNode;
  className?: string | undefined;
  /** What the pane shows while no view is open in it. */
  resting: ReactNode;
}

/**
 * A pane beside an open panel's content (the desktop Music setup, `22` §4.12): deeper steps
 * slide in over the pane alone, so the content beside it stays in reach.
 */
export function PanelViewPane({ children, className, resting }: PanelViewPaneProps) {
  const { panel } = useContext(PanelViewHostContext);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const host = useMemo(() => ({ element, panel }), [element, panel]);

  return (
    <>
      <PanelViewHostContext.Provider value={host}>{children}</PanelViewHostContext.Provider>
      <div className={className} ref={setElement}>
        {resting}
      </div>
    </>
  );
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
