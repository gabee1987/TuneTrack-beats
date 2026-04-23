export function createToggleHintFadeMotion(
  reduceMotion: boolean,
  isEnabled: boolean,
): { opacity: number } {
  if (reduceMotion) {
    return { opacity: isEnabled ? 0 : 1 };
  }

  return { opacity: isEnabled ? 0 : 1 };
}

export function createMeasuredDisclosureMotion(
  reduceMotion: boolean,
  isOpen: boolean,
  expandedHeight: number,
): { height: number; opacity: number } {
  if (reduceMotion) {
    return {
      height: isOpen ? expandedHeight : 0,
      opacity: isOpen ? 1 : 0,
    };
  }

  return {
    height: isOpen ? expandedHeight : 0,
    opacity: isOpen ? 1 : 0,
  };
}
