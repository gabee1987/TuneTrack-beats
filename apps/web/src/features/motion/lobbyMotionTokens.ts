export function createToggleHintFadeMotion(
  _reduceMotion: boolean,
  isEnabled: boolean,
): { opacity: number } {
  return { opacity: isEnabled ? 0 : 1 };
}

export function createMeasuredDisclosureMotion(
  _reduceMotion: boolean,
  isOpen: boolean,
  expandedHeight: number,
): { height: number; opacity: number } {
  return {
    height: isOpen ? expandedHeight : 0,
    opacity: isOpen ? 1 : 0,
  };
}
