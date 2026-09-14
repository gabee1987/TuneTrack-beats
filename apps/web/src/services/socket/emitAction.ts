import type { ActionAck, ClientToServerEventName } from "@tunetrack/shared";
import { getSocketClient } from "./socketClient";

const DEFAULT_ACTION_TIMEOUT_MS = 8_000;

export type EmitActionResult =
  | { status: "ok" }
  | { status: "rejected"; code: string }
  | { status: "timeout" }
  | { status: "offline" };

interface EmitActionOptions {
  onTimeoutRetry?: () => void;
  retryOnTimeout?: boolean;
  timeoutMs?: number;
}

export async function emitAction<TPayload extends object>(
  event: ClientToServerEventName,
  payload: TPayload,
  options: EmitActionOptions = {},
): Promise<EmitActionResult> {
  const socketClient = await getSocketClient();
  const requestId = crypto.randomUUID();
  const actionPayload = { ...payload, requestId };
  const attemptCount = options.retryOnTimeout ? 2 : 1;

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    if (!socketClient.connected) {
      return { status: "offline" };
    }

    try {
      const ack = (await socketClient
        .timeout(options.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS)
        .emitWithAck(event, actionPayload)) as ActionAck;

      if (ack.ok) {
        return { status: "ok" };
      }

      return {
        status: "rejected",
        code: ack.code ?? "ACTION_REJECTED",
      };
    } catch {
      if (attempt === attemptCount - 1) {
        return { status: "timeout" };
      }
      if (!socketClient.connected) {
        return { status: "offline" };
      }

      options.onTimeoutRetry?.();
    }
  }

  return { status: "timeout" };
}
