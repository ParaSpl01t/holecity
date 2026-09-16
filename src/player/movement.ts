import { PLAYZONE_SIZE } from '../world/zones';

/** A position or direction on the ground plane (world x and z), in m. */
export interface GroundVector {
	x: number;
	z: number;
}

/** Hole top speed, in m/s. */
export const HOLE_SPEED = 12;

/**
 * Farthest the hole center may get from the origin on either axis: the
 * playzone half-size. Every corner is reachable, and at an edge the hole
 * overhangs into the borderzone.
 */
export const MOVE_LIMIT = PLAYZONE_SIZE / 2;

/**
 * Moves `position` along `direction` (length 0..1, a fraction of top speed)
 * for `dt` seconds, clamped per axis so the hole slides along edges. Mutates
 * `position`.
 */
export function moveHole(
	position: GroundVector,
	direction: GroundVector,
	dt: number
): void {
	const distance = HOLE_SPEED * dt;
	position.x = clampToLimit(position.x + direction.x * distance);
	position.z = clampToLimit(position.z + direction.z * distance);
}

function clampToLimit(value: number): number {
	return Math.min(Math.max(value, -MOVE_LIMIT), MOVE_LIMIT);
}
