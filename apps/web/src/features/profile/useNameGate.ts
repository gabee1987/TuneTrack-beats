import { useRef, useState } from "react";
import type { NameSheetProps } from "./NameSheet";
import { usePlayerProfileStore } from "./playerProfile";

export interface NameGate {
  displayName: string;
  hasName: boolean;
  /** Opens the Name sheet to change the saved name. */
  openNameSheet: () => void;
  /** Runs the action now, or after the Name sheet when this device has no name yet. */
  requireName: (action: () => void) => void;
  nameSheetProps: NameSheetProps;
}

/**
 * A missing name is asked for in place (`22` §2 principle 2): the Host or Join tap opens the
 * Name sheet and carries on once a name is saved, instead of a disabled page. The action runs
 * after the sheet has closed, so its history entry is gone before the action navigates.
 */
export function useNameGate(onNameSaved?: (displayName: string) => void): NameGate {
  const displayName = usePlayerProfileStore((state) => state.displayName);
  const hasName = usePlayerProfileStore((state) => state.hasCompletedSetup);
  const setDisplayName = usePlayerProfileStore((state) => state.setDisplayName);
  const [isOpen, setIsOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const actionAfterCloseRef = useRef<(() => void) | null>(null);

  return {
    displayName,
    hasName,
    openNameSheet: () => {
      pendingActionRef.current = null;
      setIsOpen(true);
    },
    requireName: (action) => {
      if (hasName) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setIsOpen(true);
    },
    nameSheetProps: {
      initialName: displayName,
      isOpen,
      onClose: () => {
        pendingActionRef.current = null;
        setIsOpen(false);
      },
      onClosed: () => {
        const action = actionAfterCloseRef.current;
        actionAfterCloseRef.current = null;
        action?.();
      },
      onSave: (name) => {
        setDisplayName(name);
        onNameSaved?.(name);
        actionAfterCloseRef.current = pendingActionRef.current;
        pendingActionRef.current = null;
        setIsOpen(false);
      },
    },
  };
}
