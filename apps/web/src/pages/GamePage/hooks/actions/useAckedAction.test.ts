import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EmitActionResult } from "../../../../services/socket/emitAction";
import { createDeferredActionResult } from "../useGamePageActions.harnesses";
import { type AckedSubmission, useAckedAction, useTargetedActionState } from "./useAckedAction";

function renderAckedAction(reportActionResult = vi.fn()) {
  return renderHook(() => {
    const action = useAckedAction<{ playerId: string }>(reportActionResult);
    return { ...action, targetedState: useTargetedActionState(action) };
  });
}

function buildSubmission(
  emitResult: Promise<EmitActionResult>,
  overrides: Partial<AckedSubmission<{ playerId: string }>> = {},
) {
  let retry = () => {};
  const submission: AckedSubmission<{ playerId: string }> = {
    target: { playerId: "12345" },
    emit: (onTimeoutRetry) => {
      retry = onTimeoutRetry;
      return emitResult;
    },
    isSubmissionCurrent: () => true,
    ...overrides,
  };
  return { retryTimedOutEmit: () => retry(), submission };
}

describe("useAckedAction", () => {
  it("goes pending, shows the timeout retry, and fails once the last attempt times out", async () => {
    const deferred = createDeferredActionResult();
    const { result } = renderAckedAction();
    const { retryTimedOutEmit, submission } = buildSubmission(deferred.promise);

    let running: Promise<void> | null = null;
    act(() => {
      running = result.current.submit(submission);
    });
    expect(result.current.status).toBe("pending");
    expect(result.current.isPending).toBe(true);
    expect(result.current.targetedState).toEqual({ playerId: "12345", status: "pending" });

    act(() => retryTimedOutEmit());
    expect(result.current.status).toBe("retrying");
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await running;
    });
    expect(result.current.status).toBe("failed");
    expect(result.current.isPending).toBe(false);
    expect(result.current.targetedState).toEqual({ playerId: "12345", status: "failed" });
  });

  it("accepts one submission at a time and a new one after the first settled", async () => {
    const deferred = createDeferredActionResult();
    const emit = vi.fn(() => deferred.promise);
    const { result } = renderAckedAction();
    const { submission } = buildSubmission(deferred.promise, { emit });

    let first: Promise<void> | null = null;
    let duplicate: Promise<void> | null = null;
    act(() => {
      first = result.current.submit(submission);
      duplicate = result.current.submit(submission);
    });
    expect(duplicate).toBeNull();
    expect(emit).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({ status: "ok" });
      await first;
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.targetedState).toBeNull();

    await act(() => result.current.submit(submission));
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("returns quietly to idle when the room moved on before the timeout or the retry", async () => {
    const deferred = createDeferredActionResult();
    const { result } = renderAckedAction();
    const { retryTimedOutEmit, submission } = buildSubmission(deferred.promise, {
      isSubmissionCurrent: () => false,
    });

    let running: Promise<void> | null = null;
    act(() => {
      running = result.current.submit(submission);
    });
    act(() => retryTimedOutEmit());
    expect(result.current.status).toBe("pending");

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await running;
    });
    expect(result.current.status).toBe("idle");
  });

  it("goes back to idle after a rejection and reports every result", async () => {
    const reportActionResult = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderAckedAction(reportActionResult);
    const rejection: EmitActionResult = { status: "rejected", code: "ACTION_REJECTED" };
    const { submission } = buildSubmission(Promise.resolve(rejection), { onSettled });

    await act(() => result.current.submit(submission));

    expect(result.current.status).toBe("idle");
    expect(reportActionResult).toHaveBeenCalledWith(rejection);
    expect(onSettled).toHaveBeenCalledWith(rejection, true);
  });

  it("treats a thrown emit like a final timeout and settles with no result", async () => {
    const reportActionResult = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderAckedAction(reportActionResult);
    const { submission } = buildSubmission(Promise.reject(new Error("socket closed")), {
      onSettled,
    });

    await act(() => result.current.submit(submission));

    expect(result.current.status).toBe("failed");
    expect(reportActionResult).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledWith(null, true);
  });

  it("keeps the submit function across re-renders", () => {
    const { result, rerender } = renderAckedAction();
    const { submit } = result.current;

    rerender();

    expect(result.current.submit).toBe(submit);
  });
});
