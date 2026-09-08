/**
 * React error boundaries only see errors thrown while rendering. An error inside an event
 * handler, a timer or a promise callback escapes every boundary: React keeps the last good
 * tree on screen, so the app looks intact while the interaction that failed silently does
 * nothing. That is indistinguishable from "the app froze".
 *
 * These handlers make such a failure loud. The banner is plain DOM and inline-styled on
 * purpose: it has to render when React is wedged and when the token pipeline is the thing
 * that broke, and it is the only readable diagnostic on a phone with no console.
 */

const BANNER_ELEMENT_ID = "tunetrack-runtime-error-banner";
const MAX_MESSAGE_LENGTH = 400;

let isInstalled = false;

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function showErrorBanner(heading: string, detail: string) {
  if (!import.meta.env.DEV || typeof document === "undefined" || !document.body) {
    return;
  }

  const existing = document.getElementById(BANNER_ELEMENT_ID);
  existing?.remove();

  const banner = document.createElement("div");
  banner.id = BANNER_ELEMENT_ID;
  banner.setAttribute("role", "alert");
  banner.style.cssText = [
    "position:fixed",
    "inset:auto 8px 8px 8px",
    "z-index:2147483647",
    "padding:12px 14px",
    "border-radius:12px",
    "background:#3b0a0a",
    "color:#ffe9e9",
    "font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace",
    "box-shadow:0 8px 30px rgba(0,0,0,.5)",
    "white-space:pre-wrap",
    "word-break:break-word",
  ].join(";");

  const text = document.createElement("div");
  text.textContent = `${heading}\n${detail.slice(0, MAX_MESSAGE_LENGTH)}`;

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Dismiss";
  dismiss.style.cssText = [
    "margin-top:10px",
    "padding:8px 12px",
    "min-height:44px",
    "border:0",
    "border-radius:8px",
    "background:#ffe9e9",
    "color:#3b0a0a",
    "font:700 12px/1 inherit",
  ].join(";");
  dismiss.addEventListener("click", () => banner.remove());

  banner.append(text, dismiss);
  document.body.append(banner);
}

export function installGlobalErrorReporter(): void {
  if (isInstalled || typeof window === "undefined") {
    return;
  }

  isInstalled = true;

  window.addEventListener("error", (event) => {
    // Failed <img>/<script> loads surface here too and are not app faults.
    if (event.target !== window && event.target instanceof Element) {
      return;
    }

    const detail = describeError(event.error ?? event.message);
    console.error("[TuneTrack] uncaught error", event.error ?? event.message);
    showErrorBanner(`Uncaught error at ${event.filename ?? "unknown"}:${event.lineno ?? 0}`, detail);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const detail = describeError(event.reason);
    console.error("[TuneTrack] unhandled promise rejection", event.reason);
    showErrorBanner("Unhandled promise rejection", detail);
  });
}
