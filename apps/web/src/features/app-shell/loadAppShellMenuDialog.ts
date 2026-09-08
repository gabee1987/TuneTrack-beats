import type { AppShellMenuDialog } from "./components/AppShellMenuDialog";

type AppShellMenuDialogModule = { default: typeof AppShellMenuDialog };

let modulePromise: Promise<AppShellMenuDialogModule> | null = null;

export function loadAppShellMenuDialog(): Promise<AppShellMenuDialogModule> {
  if (!modulePromise) {
    modulePromise = import("./components/AppShellMenuDialog")
      .then((module) => ({ default: module.AppShellMenuDialog }))
      .catch((error: unknown) => {
        // A failed load must not be remembered, or the menu stays broken for the rest of
        // the session even once the network recovers.
        modulePromise = null;
        throw error;
      });
  }

  return modulePromise;
}

/**
 * Warm the dialog chunk from a route that is about to show the menu trigger. Without it
 * the first tap has to download the chunk before anything can render, so the panel
 * appears to stutter open.
 *
 * Lives in its own module so `app/preloadRoutes` does not have to import a component.
 */
export function preloadAppShellMenu(): void {
  // A warm-up must never surface as an unhandled rejection; the real open path reports it.
  void loadAppShellMenuDialog().catch(() => {});
}
