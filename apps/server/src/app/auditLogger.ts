import { enqueueAxiomLogEvent } from "./axiomLogSink.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

type AuditOutcome = "failed" | "received" | "succeeded";

interface AuditEventInput {
  auditKind: "realtime" | "spotify_auth" | "spotify_import";
  action: string;
  outcome: AuditOutcome;
  roomId?: string | undefined;
  socketId?: string | undefined;
  code?: string | undefined;
  message?: string | undefined;
  meta?: Record<string, unknown> | undefined;
}

export function logAuditEvent(input: AuditEventInput): void {
  if (!env.ENABLE_EVENT_AUDIT) return;

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
