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
}: OverlayRegistrationOptions): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

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

/** The open overlay panel that `PanelView`s inside it render into. */
export const PanelViewHostContext = createContext<HTMLElement | null>(null);
