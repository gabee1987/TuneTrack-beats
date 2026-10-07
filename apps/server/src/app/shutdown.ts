import { ServerToClientEvent } from "@tunetrack/shared";

type ShutdownSignal = "SIGINT" | "SIGTERM";

interface SignalSource {
  on(event: ShutdownSignal, listener: () => void): unknown;
}

interface ShutdownSocketServer {
  emit(event: typeof ServerToClientEvent.ServerShuttingDown): unknown;
  /** Disconnects every socket and closes the attached HTTP server. */
  close(): Promise<void>;
}

interface ShutdownLogger {
  info(details: Record<string, unknown>, message: string): void;
  error(details: Record<string, unknown>, message: string): void;
}

export interface ShutdownDependencies {
  socketServer: ShutdownSocketServer;
  clearRoomTimers: () => void;
  recordServerStopped: (signal: ShutdownSignal) => void;
  flushAuditLog: () => Promise<void>;
  log: ShutdownLogger;
  exit: (code: number) => void;
}

/** Clients get this long to receive `ServerShuttingDown` before the HTTP server stops waiting. */
export const SOCKET_DRAIN_MS = 2_000;
/** Hosting platforms send `SIGKILL` some seconds after `SIGTERM`; exit on our own terms first. */
export const SHUTDOWN_DEADLINE_MS = 5_000;

export function registerGracefulShutdown(
  signalSource: SignalSource,
  dependencies: ShutdownDependencies,
): void {
  let isShuttingDown = false;

  const shutDown = (signal: ShutdownSignal): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    void runShutdownSequence(signal, dependencies);
  };

  signalSource.on("SIGTERM", () => shutDown("SIGTERM"));
  signalSource.on("SIGINT", () => shutDown("SIGINT"));
}

async function runShutdownSequence(
  signal: ShutdownSignal,
  {
    socketServer,
    clearRoomTimers,
    recordServerStopped,
    flushAuditLog,
    log,
    exit,
  }: ShutdownDependencies,
): Promise<void> {
  log.info({ signal }, "server shutting down");
  let hasExited = false;
  const finish = (code: number): void => {
    if (hasExited) return;
    hasExited = true;
    clearTimeout(deadline);
    exit(code);
  };
  const deadline = setTimeout(() => {
    log.error({ signal, deadlineMs: SHUTDOWN_DEADLINE_MS }, "shutdown timed out, exiting");
    finish(1);
  }, SHUTDOWN_DEADLINE_MS);

  try {
    clearRoomTimers();
    socketServer.emit(ServerToClientEvent.ServerShuttingDown);
    await settleWithin(socketServer.close(), SOCKET_DRAIN_MS);
    recordServerStopped(signal);
    await flushAuditLog();
    finish(0);
  } catch (error) {
    log.error({ err: error, signal }, "shutdown failed, exiting");
    finish(1);
  }
}

async function settleWithin(work: Promise<void>, timeoutMs: number): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutReached = new Promise<void>((resolve) => {
    timeout = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([work, timeoutReached]);
  } finally {
    clearTimeout(timeout);
  }
}
