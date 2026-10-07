import { motionEasePrimitives } from "../../features/theme/tokens";

export const DRAG_ACTIVATION_DISTANCE_PX = 4;
/**
 * dnd-kit scrolls `acceleration` px every `interval` ms at the far edge of the zone, scaled
 * by how deep the pointer is in it: at most ~200 px/s, slow enough to aim at a slot. Its
 * default (10 px every 5 ms) crossed a long timeline almost instantly.
 */
export const TIMELINE_AUTO_SCROLL = {
  acceleration: 2,
  interval: 10,
  threshold: { x: 0.2, y: 0.2 },
};
// A reorder is a state change, not a celebration: standard ease inside the 200-350 ms budget.
export const TIMELINE_REORDER_DURATION_MS = 280;
export const TIMELINE_REORDER_EASING = motionEasePrimitives.standard;
// Shorter than the reorder itself, so a reorder never queues against a running one.
export const TIMELINE_REORDER_THROTTLE_MS = 90;
