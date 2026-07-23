import { enqueueAxiomLogEvent } from "./axiomLogSink.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

type AuditOutcome = "failed" | "received" | "succeeded";

interface AuditEventInput {
  auditKind: "realtime" | "server" | "spotify_auth" | "spotify_import";
  action: string;
  outcome: AuditOutcome;
  roomId?: string | undefined;
  socketId?: string | undefined;
  code?: string | undefined;
  message?: string | undefined;
  meta?: Record<string, unknown> | undefined;
}

export function logAuditEvent(input: AuditEventInput): void {
  // Spotify auth/import audits always emit when Axiom is configured so local
  // phone OAuth debugging does not require flipping every realtime audit flag.
  const shouldAudit =
    env.ENABLE_EVENT_AUDIT ||
    ((input.auditKind === "spotify_auth" || input.auditKind === "spotify_import") &&
      Boolean(env.AXIOM_TOKEN && env.AXIOM_DATASET));

  if (!shouldAudit) return;

  const auditEvent = {
    service: "tunetrack-server",
    time: new Date().toISOString(),
    testRunId: env.TEST_RUN_ID,
    auditKind: input.auditKind,
    action: input.action,
    outcome: input.outcome,
    roomId: input.roomId,
    socketId: input.socketId,
    code: input.code,
    message: input.message,
    ...input.meta,
  };

  logger.info(auditEvent, `${input.auditKind} audit`);
  enqueueAxiomLogEvent(auditEvent);
}
