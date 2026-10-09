import type { ServerErrorCode } from "../errors/serverErrors.js";

export interface ActionAck {
  ok: boolean;
  requestId: string;
  code?: ServerErrorCode;
}
