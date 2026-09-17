import type { Object3D } from 'three';

/**
 * A themed map on the three standard zones (admin, 2026-09-17): the playzone
 * at elevation 0, the borderzone above it, the outzone below the borderzone
 * top. Zone sizes are shared (`world/zones.ts`); heights and base terrain are
 * the environment's own.
 */
export interface Environment {
	/** Seed of everything random in it: terrain details, object layout. */
	readonly seed: number;
	/** Borderzone top, in m above the playzone. */
	readonly borderHeight: number;
	/** Outzone surface elevation, in m. Below the borderzone top. */
	readonly outzoneLevel: number;
	/** Clear color, sRGB hex: shows past the outzone surface's reach. */
	readonly background: number;
	/**
	 * Base terrain of all three zones, visuals only: colliders follow from the
	 * heights. The playzone must skip pixels marked with `HOLE_STENCIL`, which
	 * is what opens the hole (see `player/hole.ts`).
	 */
	createTerrain(): Object3D;
}
