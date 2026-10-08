import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Lifts non-modal layers (the mobile action dock, the challenge callout, flyouts, hints) out
 * of the page so a page transform cannot clip or carry them. Unlike `Overlay`, it takes no
 * stack entry: no focus trap, no scroll lock, no Back handling.
 */
export function LayerPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
