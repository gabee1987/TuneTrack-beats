import {
  getTopOverlayEntry,
  pushOverlayEntry,
  removeOverlayEntry,
  type OverlayStackEntry,
} from "./overlayStack";

export interface OverlayRegistration extends OverlayStackEntry {
  dismiss: () => void;
  getPanel: () => HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let stack: OverlayStackEntry[] = [];
const registrations = new Map<string, OverlayRegistration>();
const listeners = new Set<() => void>();
let releaseDocument: (() => void) | null = null;

export function subscribeOverlayStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOverlayStack(): readonly OverlayStackEntry[] {
  return stack;
}

export function registerOverlay(registration: OverlayRegistration): () => void {
  registrations.set(registration.id, registration);
  setStack(
    pushOverlayEntry(stack, {
      dismissible: registration.dismissible,
      id: registration.id,
      kind: registration.kind,
    }),
  );

  return () => {
    registrations.delete(registration.id);
    setStack(removeOverlayEntry(stack, registration.id));
  };
}

export function dismissTopOverlay(id: string): void {
  const top = getTopOverlayEntry(stack);

  if (top?.id === id && top.dismissible) {
    registrations.get(id)?.dismiss();
  }
}

function setStack(nextStack: OverlayStackEntry[]) {
  stack = nextStack;

  if (stack.length > 0 && !releaseDocument) {
    releaseDocument = holdDocument();
  } else if (stack.length === 0 && releaseDocument) {
    releaseDocument();
    releaseDocument = null;
  }

  listeners.forEach((listener) => listener());
}

/** Escape, the focus trap and the scroll lock exist once for the whole stack. */
function holdDocument(): () => void {
  const { body, documentElement } = document;
  const scrollY = window.scrollY;
  const previousBodyOverflow = body.style.overflow;
  const previousRootOverflow = documentElement.style.overflow;
  body.style.overflow = "hidden";
  documentElement.style.overflow = "hidden";
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    body.style.overflow = previousBodyOverflow;
    documentElement.style.overflow = previousRootOverflow;

    if (window.scrollY !== scrollY) {
      window.scrollTo(0, scrollY);
    }
  };
}

function handleKeyDown(event: KeyboardEvent) {
  const top = getTopOverlayEntry(stack);

  if (!top) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    dismissTopOverlay(top.id);
    return;
  }

  if (event.key === "Tab") {
    trapFocus(event, registrations.get(top.id)?.getPanel() ?? null);
  }
}

function trapFocus(event: KeyboardEvent, panel: HTMLElement | null) {
  if (!panel) {
    return;
  }

  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!first || !last) {
    event.preventDefault();
    panel.focus();
    return;
  }

  if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
