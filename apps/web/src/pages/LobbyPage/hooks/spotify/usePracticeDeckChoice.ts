import { ClientToServerEvent } from "@tunetrack/shared/client";
import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { emitAction } from "../../../../services/socket/emitAction";

export type PracticeDeckChoiceStatus = "idle" | "pending" | "failed";

/** The host's explicit choice of the bundled deck; Start needs a deck (decision 7). */
export function usePracticeDeckChoice() {
  const { roomId } = useParams<{ roomId: string }>();
  const isPendingRef = useRef(false);
  const [status, setStatus] = useState<PracticeDeckChoiceStatus>("idle");

  const choosePracticeDeck = useCallback(async () => {
    if (!roomId || isPendingRef.current) return;

    isPendingRef.current = true;
    setStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.UsePracticeDeck,
        { roomId },
        { retryOnTimeout: true },
      );
      setStatus(result.status === "ok" ? "idle" : "failed");
    } catch {
      setStatus("failed");
    } finally {
      isPendingRef.current = false;
    }
  }, [roomId]);

  return { choosePracticeDeck, status };
}
