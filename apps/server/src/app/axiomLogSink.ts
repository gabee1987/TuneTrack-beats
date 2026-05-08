import { env } from "./env.js";

const MAX_BATCH_SIZE = 25;
const MAX_QUEUE_SIZE = 1_000;
const FLUSH_INTERVAL_MS = 5_000;

type AxiomLogEvent = Record<string, unknown>;

let queuedEvents: AxiomLogEvent[] = [];
let flushTimer: NodeJS.Timeout | undefined;
let activeFlush: Promise<void> | undefined;

export function enqueueAxiomLogEvent(event: AxiomLogEvent): void {
  if (!isAxiomConfigured()) return;

  queuedEvents.push(event);
  if (queuedEvents.length > MAX_QUEUE_SIZE) {
    queuedEvents = queuedEvents.slice(queuedEvents.length - MAX_QUEUE_SIZE);
  }

  if (queuedEvents.length >= MAX_BATCH_SIZE) {
    void flushAxiomLogEvents();
    return;
  }

  scheduleFlush();
}

export async function flushAxiomLogEvents(): Promise<void> {
  if (!isAxiomConfigured() || activeFlush) {
    return activeFlush;
  }

  const events = queuedEvents.splice(0, MAX_BATCH_SIZE);
  if (events.length === 0) return;

  activeFlush = sendAxiomBatch(events)
    .catch((error: unknown) => {
      queuedEvents = [...events, ...queuedEvents].slice(0, MAX_QUEUE_SIZE);
      reportAxiomFailure(error);
    })
    .finally(() => {
      activeFlush = undefined;
      if (queuedEvents.length > 0) scheduleFlush();
    });

  return activeFlush;
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushAxiomLogEvents();
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref();
}

async function sendAxiomBatch(events: AxiomLogEvent[]): Promise<void> {
  const response = await postAxiomBatch(buildDatasetIngestUrl(), events);
  if (response.ok) return;

  const fallbackResponse = await postAxiomBatch(buildEdgeIngestUrl(), events);
  if (fallbackResponse.ok) return;

  const responseBody = await readResponseBody(response);
  const fallbackResponseBody = await readResponseBody(fallbackResponse);
  throw new Error(
    `Axiom ingest failed with ${response.status} ${response.statusText}: ${responseBody}; fallback failed with ${fallbackResponse.status} ${fallbackResponse.statusText}: ${fallbackResponseBody}`,
  );
}

function postAxiomBatch(url: string, events: AxiomLogEvent[]): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AXIOM_TOKEN}`,
      "Content-Type": "application/x-ndjson",
    },
    body: events.map((event) => JSON.stringify(event)).join("\n"),
  });
}

function buildDatasetIngestUrl(): string {
  return `https://api.axiom.co/v1/datasets/${encodeURIComponent(env.AXIOM_DATASET ?? "")}/ingest`;
}

function buildEdgeIngestUrl(): string {
  const baseUrl = env.AXIOM_DOMAIN.replace(/\/$/, "");
  return `${baseUrl}/v1/ingest/${encodeURIComponent(env.AXIOM_DATASET ?? "")}`;
}

function isAxiomConfigured(): boolean {
  return Boolean(env.AXIOM_TOKEN && env.AXIOM_DATASET);
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body.length > 500 ? `${body.slice(0, 500)}...` : body;
  } catch {
    return "[response body unavailable]";
  }
}

function reportAxiomFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown Axiom ingest failure";
  process.stderr.write(
    `${JSON.stringify({
      level: "error",
      service: "tunetrack-server",
      type: "axiom_ingest_error",
      message,
    })}\n`,
  );
}
