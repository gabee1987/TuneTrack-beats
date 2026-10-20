interface FatalEventSource {
  on(event: "uncaughtException", listener: (error: Error) => void): unknown;
  on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown;
}

interface FatalLogger {
  fatal(details: { err: unknown }, message: string): void;
}

/**
 * State after an unexpected throw is unknown, so the process logs and exits non-zero and the
 * platform restarts it; continuing could serve corrupted rooms.
 */
export function registerProcessFatalHandlers(
  eventSource: FatalEventSource,
  log: FatalLogger,
  exit: (code: number) => void,
): void {
  eventSource.on("uncaughtException", (error) => {
    log.fatal({ err: error }, "uncaught exception, exiting");
    exit(1);
  });
  eventSource.on("unhandledRejection", (reason) => {
    log.fatal({ err: reason }, "unhandled promise rejection, exiting");
    exit(1);
  });
}
