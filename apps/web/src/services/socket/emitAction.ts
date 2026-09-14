import type { ActionAck, ClientToServerEventName } from "@tunetrack/shared";
import { getSocketClient } from "./socketClient";

const DEFAULT_ACTION_TIMEOUT_MS = 8_000;

export type EmitActionResult =
  | { status: "ok" }
  | { status: "rejected"; code: string }
  | { status: "timeout" }
  | { status: "offline" };

interface EmitActionOptions {
  timeoutMs?: number;
}

export async function emitAction<TPayload extends object>(
  event: ClientToServerEventName,
  payload: TPayload,
  options: EmitActionOptions = {},
): Promise<EmitActionResult> {
  const socketClient = await getSocketClient();
  if (!socketClient.connected) {
    return { status: "offline" };
  }

  const requestId = crypto.randomUUID();

  try {
    const ack = (await socketClient
      .timeout(options.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS)
      .emitWithAck(event, { ...payload, requestId })) as ActionAck;

    if (ack.ok) {
      return { status: "ok" };
    }

    return {
      status: "rejected",
      code: ack.code ?? "ACTION_REJECTED",
    };
  } catch {
    return { status: "timeout" };
  }
}
