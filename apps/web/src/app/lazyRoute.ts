const CHUNK_RELOAD_STORAGE_KEY = "tunetrack-chunk-reload-attempted";

/**
 * If the reload never takes effect, the router must still be able to render its error
 * element. A promise that never settles leaves the navigation pending forever, and every
 * later navigation queues behind it — the app keeps answering local input (menus, panels)
 * but can never change screen again, which reads as "the button does nothing, only a
 * refresh helps".
 */
const RELOAD_GRACE_MS = 4_000;

function isDynamicImportError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
    error.message,
  );
}

function hasReloadBeenAttempted(): boolean {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberReloadAttempt(attempted: boolean): void {
  try {
    if (attempted) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "true");
      return;
    }

    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    // Storage access throws in private browsing modes. The reload budget is a nicety;
    // losing it only means a second reload attempt is possible.
  }
}

function rejectAfterReloadGrace<TModule>(error: unknown): Promise<TModule> {
  return new Promise<TModule>((_resolve, reject) => {
    window.setTimeout(() => reject(error), RELOAD_GRACE_MS);
  });
}

export async function loadLazyRoute<TModule>(
  moduleLoader: () => Promise<TModule>,
): Promise<TModule> {
  try {
    const routeModule = await moduleLoader();
    rememberReloadAttempt(false);
    return routeModule;
  } catch (error) {
    if (!isDynamicImportError(error) || hasReloadBeenAttempted()) {
      throw error;
    }

    rememberReloadAttempt(true);
    window.location.reload();

    return rejectAfterReloadGrace<TModule>(error);
  }
}
