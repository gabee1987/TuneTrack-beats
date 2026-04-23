export function createAppShellMenuSheetOffset(
  reduceMotion: boolean,
  isMobileSheet: boolean,
): { x: number; y: number } {
  void isMobileSheet;

  if (reduceMotion) {
    return { x: 0, y: 0 };
  }

  return { x: 56, y: 0 };
}

export function createAppShellMenuSheetMotionTargets(
  reduceMotion: boolean,
  isMobileSheet: boolean,
): {
  animate: { opacity: number; x: number; y: number };
  exit: { opacity: number; x: number; y: number };
  initial: { opacity: number; x: number; y: number };
} {
  const offset = createAppShellMenuSheetOffset(reduceMotion, isMobileSheet);

  return {
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: offset.x, y: offset.y },
    initial: { opacity: 0, x: offset.x, y: offset.y },
  };
}
