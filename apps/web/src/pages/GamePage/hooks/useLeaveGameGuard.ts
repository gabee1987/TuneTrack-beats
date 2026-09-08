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
 * Back — the browser's button or the phone's — must not drop a player out of a running
 * game silently, because the route it returns to no longer represents anything the player
 * can act on.
 *
 * Only `POP` is guarded: the app's own redirects (room closed, closed-room reset, game
 * start) are deliberate and must proceed untouched.
 */
export function useLeaveGameGuard({ isGuarded }: UseLeaveGameGuardOptions): LeaveGameGuard {
  const blocker = useBlocker(
    ({ currentLocation, historyAction, nextLocation }) =>
      isGuarded &&
      historyAction === "POP" &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  function confirmLeave() {
    if (blocker.state !== "blocked") {
      return;
    }

    // There is no "leave room" event in the protocol, so closing the socket is what tells
    // the server this player is gone rather than momentarily unreachable.
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
    isConfirmVisible: blocker.state === "blocked",
  };
}
