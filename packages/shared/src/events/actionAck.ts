import type { ServerErrorCode } from "../errors/serverErrors.js";

export interface ActionAck<TResult = void> {
  ok: boolean;
  requestId: string;
  code?: ServerErrorCode;
  result?: TResult;
}
