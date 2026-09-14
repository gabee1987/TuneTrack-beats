export interface ActionAck<TResult = void> {
  ok: boolean;
  requestId: string;
  code?: string;
  result?: TResult;
}
