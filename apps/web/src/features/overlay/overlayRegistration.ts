import { createContext, useEffect, useRef, type RefObject } from "react";
import type { OverlayStackKind } from "./overlayStack";
import { registerOverlay } from "./overlayStore";

interface OverlayRegistrationOptions {
  dismissible: boolean;
  id: string;
  isShown: boolean;
  kind: OverlayStackKind;
  onDismiss: () => void;
  panelRef: RefObject<HTMLElement | null>;
  /** Where Tab and scrolling stay while it is open, when that is more than the panel itself. */
  scope?: HTMLElement | null | undefined;
}

/**
 * Puts a shown overlay or panel view on the stack, moves focus into it, and on close takes
 * it off the stack and returns focus to whatever opened it.
 */
export function useOverlayRegistration({
  dismissible,
  id,
  isShown,
  kind,
  onDismiss,
  panelRef,
  scope,
}: OverlayRegistrationOptions): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    if (!isShown) {
      return undefined;
    }

    const trigger = document.activeElement;
    const unregister = registerOverlay({
      dismiss: () => onDismissRef.current(),
      dismissible,
      getPanel: () => scopeRef.current ?? panelRef.current,
      id,
      kind,
    });
    // A form overlay marks its first field `data-autofocus`, so typing can start at once.
    const panel = panelRef.current;
    const initialFocus = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    initialFocus?.focus({ preventScroll: true });

    return () => {
      unregister();

      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [dismissible, id, isShown, kind, panelRef]);
}

/** Where a `PanelView` opens: over the whole open panel, or over one pane of it. */
export interface PanelViewHost {
  element: HTMLElement | null;
  panel: HTMLElement | null;
}

export const PanelViewHostContext = createContext<PanelViewHost>({ element: null, panel: null });
