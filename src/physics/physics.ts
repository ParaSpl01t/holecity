import type { World } from '@dimforge/rapier3d-compat';

export type Rapier = typeof import('@dimforge/rapier3d-compat');

/** Fixed physics step, in s, so results never depend on the frame rate. */
export const STEP = 1 / 60;

/**
 * Gravity, in m/s². Three times Earth's: at these object sizes, Earth gravity
 * reads as slow motion. Was twice Earth's until the admin asked for more
 * (2026-09-17).
 */
export const GRAVITY = 29.4;

/** Surface friction shared by the ground, walls and objects. */
export const FRICTION = 0.8;

/** Bounciness shared by objects: a little, for a toy feel. */
export const RESTITUTION = 0.1;

/**
 * Loads Rapier (WASM inlined) as its own chunk and initializes it. The game is
 * playable before it arrives.
 */
export async function loadRapier(): Promise<Rapier> {
	const rapier = await import('@dimforge/rapier3d-compat');
	await rapier.init();
	return rapier;
}

export function createWorld(rapier: Rapier): World {
	const world = new rapier.World({ x: 0, y: -GRAVITY, z: 0 });
	world.timestep = STEP;
	return world;
}
