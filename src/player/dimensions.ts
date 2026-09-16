/** Starting radius of the hole opening, in m (4 m wide). */
export const HOLE_RADIUS = 2;

/**
 * Temporary size controls (admin, 2026-09-16): radius limits and step per
 * press, in m. Real growth comes later.
 */
export const MIN_HOLE_RADIUS = 1;
export const MAX_HOLE_RADIUS = 8;
export const HOLE_RADIUS_STEP = 0.5;

/** Width of the yellow ring around the opening, in m. */
export const RING_WIDTH = 1;

/**
 * Thickness of the ground, in m: all there is to the opening's edge. Below it
 * is empty void, endless in every direction (admin, 2026-09-16).
 */
export const GROUND_THICKNESS = 1;

/**
 * Depth of the void's black backdrop, in m. Whatever falls fully past it is
 * out of sight and removed.
 */
export const ABYSS_DEPTH = 24;
