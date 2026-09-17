/**
 * Zone sizes, the same in every environment: playzone, borderzone around it,
 * outzone beyond (admin, 2026-09-17). Heights and looks vary per environment,
 * see `environments/environment.ts`.
 */

/** Playzone side length, in m. The square is centered on the origin. */
export const PLAYZONE_SIZE = 200;

/** Borderzone width around the playzone, in m. */
export const BORDER_WIDTH = 10;

/** Half the side of the land (playzone plus borderzone), in m. */
export const LAND_HALF = PLAYZONE_SIZE / 2 + BORDER_WIDTH;

/**
 * How far the outzone surface reaches past the land, in m; the clear color
 * shows beyond. From a hole at the playzone edge, 200 m fills the view of
 * every window down to a 1:3 portrait.
 */
export const OUTZONE_REACH = 200;
