export type TokenSpendAnimationStart = (payload: {
  amount: number;
  originX: number;
  originY: number;
}) => void;

/** The spent token flies out of the centre of its cost badge, or of the button without one. */
export function getTokenSpendOrigin(costBadge: Element | null, button: Element) {
  const sourceBounds = (costBadge ?? button).getBoundingClientRect();
  return {
    originX: sourceBounds.left + sourceBounds.width / 2,
    originY: sourceBounds.top + sourceBounds.height / 2,
  };
}
