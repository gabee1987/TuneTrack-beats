import { useIsPresent } from "framer-motion";
import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { resetSocketClient } from "../../../services/socket/socketClient";

interface UseLeaveGameGuardOptions {
  isGuarded: boolean;
}

export interface LeaveGameGuard {
  confirmLeave: () => void;
  dismissLeave: () => void;
  isConfirmVisible: boolean;
}

/**
 * Back — the browser's button or the phone's — must not drop a player out of a running game
 * silently, because the screen it returns to cannot resume the game.
 *
 * Only `POP` is guarded, so the app's own redirects (room closed, closed-room reset, game
 * start) proceed untouched.
 *
 * The presence check is what makes this safe to hold: React Router honours one blocker at a
 * time, and a page can stay mounted after its exit begins, so a guard that ignored presence
 * could sit blocking every later navigation for the rest of the session.
 */
export function useLeaveGameGuard({ isGuarded }: UseLeaveGameGuardOptions): LeaveGameGuard {
  const isPresent = useIsPresent();
  const canBlock = isGuarded && isPresent;
  const blocker = useBlocker(
    ({ currentLocation, historyAction, nextLocation }) =>
      canBlock &&
      historyAction === "POP" &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  const isBlocked = blocker.state === "blocked";

  // Refusing future navigations is not enough: a navigation already held has to be released
  // when this page stops being the one on screen, or it never resolves.
  useEffect(() => {
    if (isBlocked && !canBlock) {
      blocker.reset?.();
    }
  }, [blocker, canBlock, isBlocked]);

  function confirmLeave() {
    if (blocker.state !== "blocked") {
      return;
    }

    // The protocol has no leave-room event, so closing the socket is the only way the
    // server learns this player left deliberately rather than briefly dropped out.
    resetSocketClient();
    blocker.proceed();
  }

  function dismissLeave() {
    if (blocker.state !== "blocked") {
      return;
    }

    blocker.reset();
  }

  return {
    confirmLeave,
    dismissLeave,
    isConfirmVisible: isBlocked,
  };
}
