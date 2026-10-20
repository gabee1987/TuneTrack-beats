import { useCallback, useMemo, useRef, useState } from "react";
import type { EmitActionResult } from "../../../../services/socket/emitAction";

export type AckedActionStatus = "idle" | "pending" | "retrying" | "failed";

interface AckedActionState<TTarget> {
  status: AckedActionStatus;
  /** What the running or failed submission was about, e.g. the player it targets. */
  target: TTarget | null;
}

export interface AckedSubmission<TTarget> {
  target: TTarget;
  emit: (onTimeoutRetry: () => void) => Promise<EmitActionResult>;
  /**
   * Whether the room is still in the state the action was submitted for. Once it moved on, a
   * retry or a failure no longer concerns the player, so the action goes quietly back to idle.
   */
  isSubmissionCurrent: () => boolean;
  /** `result` is null when the emit threw. */
  onSettled?: (result: EmitActionResult | null, isSubmissionCurrent: boolean) => void;
}

const IDLE_STATE: AckedActionState<never> = { status: "idle", target: null };

/**
 * One acknowledged room action: a single submission at a time, `retrying` while `emitAction`
 * repeats a timed-out emit, and `failed` only when the final attempt timed out (or threw) while
 * the room still matches the submission. Offline results go to `reportActionResult`.
 */
export function useAckedAction<TTarget = null>(
  reportActionResult: (result: EmitActionResult) => void,
) {
  const isPendingRef = useRef(false);
  const [state, setState] = useState<AckedActionState<TTarget>>(IDLE_STATE);

  const submit = useCallback(
    (submission: AckedSubmission<TTarget>): Promise<void> | null => {
      if (isPendingRef.current) return null;

      const { emit, isSubmissionCurrent, onSettled, target } = submission;
      const settle = (status: AckedActionStatus) =>
        setState(status === "idle" ? IDLE_STATE : { status, target });

      isPendingRef.current = true;
      settle("pending");
      return (async () => {
        try {
          const result = await emit(() => {
            if (isSubmissionCurrent()) settle("retrying");
          });
          reportActionResult(result);
          const isCurrent = isSubmissionCurrent();
          onSettled?.(result, isCurrent);
          settle(result.status === "timeout" && isCurrent ? "failed" : "idle");
        } catch {
          const isCurrent = isSubmissionCurrent();
          onSettled?.(null, isCurrent);
          settle(isCurrent ? "failed" : "idle");
        } finally {
          isPendingRef.current = false;
        }
      })();
    },
    [reportActionResult],
  );

  return {
    isPending: state.status === "pending" || state.status === "retrying",
    status: state.status,
    submit,
    target: state.target,
  };
}

/** The `{ ...target, status }` shape the game menu reads for per-player actions; null while idle. */
export function useTargetedActionState<TTarget extends object>({
  status,
  target,
}: {
  status: AckedActionStatus;
  target: TTarget | null;
}) {
  return useMemo(
    () => (status === "idle" || !target ? null : { ...target, status }),
    [status, target],
  );
}
