import type {
  ActionAck,
  ClientToServerEventName,
  ClientToServerPayloads,
} from "@tunetrack/shared/client";
import { createSessionId } from "../session/sessionId";
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

/** `emitAction` adds the `requestId` itself. */
export type ActionPayload<TEvent extends ClientToServerEventName> = Omit<
  ClientToServerPayloads[TEvent],
  "requestId"
>;

export async function emitAction<TEvent extends ClientToServerEventName>(
  event: TEvent,
  payload: ActionPayload<TEvent>,
  options: EmitActionOptions = {},
): Promise<EmitActionResult> {
  const socketClient = await getSocketClient();
  const requestId = createSessionId(globalThis.crypto);
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
