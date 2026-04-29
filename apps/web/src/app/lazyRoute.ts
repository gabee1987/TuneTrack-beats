const CHUNK_RELOAD_STORAGE_KEY = "tunetrack-chunk-reload-attempted";

function isDynamicImportError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
    error.message,
  );
}

export async function loadLazyRoute<TModule>(
  moduleLoader: () => Promise<TModule>,
): Promise<TModule> {
  try {
    const routeModule = await moduleLoader();
    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
    return routeModule;
  } catch (error) {
    const hasAlreadyReloaded =
      window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) === "true";

    if (!hasAlreadyReloaded && isDynamicImportError(error)) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "true");
      window.location.reload();

      return new Promise<TModule>(() => {
        // Keep React Router waiting while the browser reloads the app shell.
      });
    }

    throw error;
  }
}
