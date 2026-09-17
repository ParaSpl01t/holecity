import { RING_WIDTH } from '../player/dimensions';
import type { GroundVector } from '../player/movement';
import { PLAYZONE_SIZE } from '../world/zones';

/** Radius of a drop's glowing halo, in m. */
export const HALO_RADIUS = 1.6;

/**
 * Drop timing, in s (admin, 2026-09-17, "ok for now"; the whole powerup
 * system's timing comes later). The first drop's delay is assumed: soon
 * enough to be found, late enough to look around first.
 */
export const FIRST_DROP_DELAY = 5;
export const NEXT_DROP_DELAY = 20;
export const MAGNET_TIME = 10;

/** A drop never appears within this many m of the playzone's edge... */
export const DROP_EDGE_MARGIN = 10;
/** ...or of the hole, which would take it at once. */
export const DROP_HOLE_CLEARANCE = 25;

/** Spots tried before giving up for a second. */
const SPOT_ATTEMPTS = 30;
const RETRY_DELAY = 1;

/** A drop on the ground plane, in world m. */
export interface Drop {
	readonly x: number;
	readonly z: number;
}

/** Whether the hole's ring reaches a drop's halo, seen from above. */
export function touches(
	hole: GroundVector,
	holeRadius: number,
	drop: Drop
): boolean {
	const reach = holeRadius + RING_WIDTH + HALO_RADIUS;
	return Math.hypot(drop.x - hole.x, drop.z - hole.z) <= reach;
}

/**
 * A random spot for a drop: inside the playzone's margin, clear of the hole
 * and of objects (`isClear`), or undefined if none turned up.
 */
export function findDropSpot(
	random: () => number,
	hole: GroundVector,
	isClear: (x: number, z: number, radius: number) => boolean
): Drop | undefined {
	const limit = PLAYZONE_SIZE / 2 - DROP_EDGE_MARGIN;
	for (let attempt = 0; attempt < SPOT_ATTEMPTS; attempt++) {
		const x = (random() * 2 - 1) * limit;
		const z = (random() * 2 - 1) * limit;
		if (Math.hypot(x - hole.x, z - hole.z) < DROP_HOLE_CLEARANCE) continue;
		if (isClear(x, z, HALO_RADIUS)) return { x, z };
	}
	return undefined;
}

/** What happened in one update. Reused: read it before the next one. */
export interface DropEvents {
	spawned: Drop | undefined;
	taken: Drop | undefined;
}

export interface Drops {
	/** The drop on the map, if any. */
	readonly drop: Drop | undefined;
	/** The magnet it gave is still on. */
	readonly magnet: boolean;
	update(dt: number, hole: GroundVector, holeRadius: number): DropEvents;
}

/**
 * Powerup drops: one on the map at a time. The first appears after
 * `FIRST_DROP_DELAY`; touching it turns the magnet on for `MAGNET_TIME`, and
 * the next appears `NEXT_DROP_DELAY` after it was taken.
 */
export function createDrops(
	random: () => number,
	isClear: (x: number, z: number, radius: number) => boolean
): Drops {
	let drop: Drop | undefined;
	let untilDrop = FIRST_DROP_DELAY;
	let magnetLeft = 0;
	const events: DropEvents = { spawned: undefined, taken: undefined };

	return {
		get drop() {
			return drop;
		},
		get magnet() {
			return magnetLeft > 0;
		},
		update(dt, hole, holeRadius) {
			events.spawned = undefined;
			events.taken = undefined;
			magnetLeft = Math.max(0, magnetLeft - dt);
			if (drop) {
				if (touches(hole, holeRadius, drop)) {
					events.taken = drop;
					drop = undefined;
					magnetLeft = MAGNET_TIME;
					untilDrop = NEXT_DROP_DELAY;
				}
			} else if ((untilDrop -= dt) <= 0) {
				drop = findDropSpot(random, hole, isClear);
				events.spawned = drop;
				if (!drop) untilDrop = RETRY_DELAY;
			}
			return events;
		},
	};
}
