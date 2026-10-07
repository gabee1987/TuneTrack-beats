import { resolvePageLayoutMode, type PageLayoutMode } from "../../app/layout/pageLayoutMode";

const COARSE_POINTER_QUERY = "(pointer: coarse)";
export const MOBILE_CONTROLS_QUERY = "(max-width: 720px), (hover: none) and (pointer: coarse)";

interface ViewportState {
  layoutMode: PageLayoutMode;
  usesMobileControls: boolean;
}

type Listener = () => void;

const stateListeners = new Set<Listener>();
const resizeListeners = new Set<Listener>();
let isSyncingAppHeight = false;
let lastAppHeight: string | null = null;
/** Only kept while attached; a detached store reads the window on demand. */
let attachedState: ViewportState | null = null;
let pendingFrame: number | null = null;
let detachListeners: (() => void) | null = null;

function readState(): ViewportState {
  return {
    layoutMode: resolvePageLayoutMode({
      isCoarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }),
    usesMobileControls: window.matchMedia(MOBILE_CONTROLS_QUERY).matches,
  };
}

// The visual viewport is what is actually visible when an on-screen keyboard is open;
// `innerHeight` is not. Unchanged values are not written, so they cost no style invalidation.
function writeAppHeight() {
  const appHeight = `${window.visualViewport?.height ?? window.innerHeight}px`;

  if (appHeight !== lastAppHeight) {
    lastAppHeight = appHeight;
    document.documentElement.style.setProperty("--app-height", appHeight);
  }
}

function flush() {
  pendingFrame = null;

  if (isSyncingAppHeight) {
    writeAppHeight();
  }

  for (const listener of resizeListeners) {
    listener();
  }

  const previousState = attachedState;
  const nextState = readState();
  attachedState = nextState;

  // An address-bar collapse changes the height on every frame but never the layout mode,
  // so state consumers are told only about a mode change.
  if (
    previousState &&
    (previousState.layoutMode !== nextState.layoutMode ||
      previousState.usesMobileControls !== nextState.usesMobileControls)
  ) {
    for (const listener of stateListeners) {
      listener();
    }
  }
}

function scheduleFlush() {
  if (pendingFrame === null) {
    pendingFrame = window.requestAnimationFrame(flush);
  }
}

function attach() {
  attachedState = readState();
  const visualViewport = window.visualViewport;
  const coarsePointerQuery = window.matchMedia(COARSE_POINTER_QUERY);
  const mobileControlsQuery = window.matchMedia(MOBILE_CONTROLS_QUERY);

  window.addEventListener("resize", scheduleFlush);
  visualViewport?.addEventListener("resize", scheduleFlush);
  visualViewport?.addEventListener("scroll", scheduleFlush);
  coarsePointerQuery.addEventListener("change", scheduleFlush);
  mobileControlsQuery.addEventListener("change", scheduleFlush);

  detachListeners = () => {
    window.removeEventListener("resize", scheduleFlush);
    visualViewport?.removeEventListener("resize", scheduleFlush);
    visualViewport?.removeEventListener("scroll", scheduleFlush);
    coarsePointerQuery.removeEventListener("change", scheduleFlush);
    mobileControlsQuery.removeEventListener("change", scheduleFlush);

    if (pendingFrame !== null) {
      window.cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
    }
  };
}

function updateAttachment() {
  const isNeeded = stateListeners.size > 0 || resizeListeners.size > 0 || isSyncingAppHeight;

  if (isNeeded && !detachListeners) {
    attach();
  } else if (!isNeeded && detachListeners) {
    detachListeners();
    detachListeners = null;
    attachedState = null;
  }
}

function addListener(listeners: Set<Listener>, listener: Listener): () => void {
  listeners.add(listener);
  updateAttachment();

  return () => {
    listeners.delete(listener);
    updateAttachment();
  };
}

/** For `useSyncExternalStore`: fires when the layout mode or the mobile-controls match changes. */
export function subscribeViewport(listener: Listener): () => void {
  return addListener(stateListeners, listener);
}

/** For imperative consumers that reposition on any size change, at most once per frame. */
export function subscribeViewportResize(listener: Listener): () => void {
  return addListener(resizeListeners, listener);
}

export function getLayoutMode(): PageLayoutMode {
  return (attachedState ?? readState()).layoutMode;
}

export function getUsesMobileControls(): boolean {
  return (attachedState ?? readState()).usesMobileControls;
}

/** Keeps `--app-height` on the root element in step with the visible viewport. */
export function startAppHeightSync(): void {
  isSyncingAppHeight = true;
  updateAttachment();
  writeAppHeight();
}
