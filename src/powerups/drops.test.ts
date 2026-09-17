import { describe, expect, it } from 'vitest';
import { createRandom } from '../engine/random';
import { HOLE_RADIUS, RING_WIDTH } from '../player/dimensions';
import { PLAYZONE_SIZE } from '../world/zones';
import {
	createDrops,
	DROP_EDGE_MARGIN,
	DROP_HOLE_CLEARANCE,
	findDropSpot,
	FIRST_DROP_DELAY,
	HALO_RADIUS,
	MAGNET_TIME,
	NEXT_DROP_DELAY,
	touches,
	type Drops,
} from './drops';

const origin = { x: 0, z: 0 };
const everywhere = () => true;

/** Advances `drops` by `seconds` in 0.1 s frames, the hole at `hole`. */
function run(
	drops: Drops,
	seconds: number,
	hole = origin,
	radius = HOLE_RADIUS
) {
	for (let t = 0; t < seconds - 1e-9; t += 0.1) drops.update(0.1, hole, radius);
}

describe('touches', () => {
	it('starts where the ring meets the halo, for any hole size', () => {
		for (const radius of [1, 2, 8]) {
			const reach = radius + RING_WIDTH + HALO_RADIUS;
			expect(touches(origin, radius, { x: reach - 0.01, z: 0 })).toBe(true);
			expect(touches(origin, radius, { x: reach + 0.01, z: 0 })).toBe(false);
		}
	});
});

describe('findDropSpot', () => {
	it('stays inside the margin, away from the hole', () => {
		const random = createRandom(4);
		const hole = { x: 30, z: -40 };
		const limit = PLAYZONE_SIZE / 2 - DROP_EDGE_MARGIN;
		for (let i = 0; i < 200; i++) {
			const spot = findDropSpot(random, hole, everywhere);
			expect(spot).toBeDefined();
			expect(Math.abs(spot!.x)).toBeLessThanOrEqual(limit);
			expect(Math.abs(spot!.z)).toBeLessThanOrEqual(limit);
			expect(
				Math.hypot(spot!.x - hole.x, spot!.z - hole.z)
			).toBeGreaterThanOrEqual(DROP_HOLE_CLEARANCE);
		}
	});

	it('only picks a spot clear of objects', () => {
		const random = createRandom(5);
		const clearEast = (x: number) => x > 0;
		for (let i = 0; i < 50; i++) {
			expect(findDropSpot(random, origin, clearEast)!.x).toBeGreaterThan(0);
		}
		expect(findDropSpot(random, origin, () => false)).toBeUndefined();
	});
});

describe('createDrops', () => {
	it('drops the first powerup after its delay, one at a time', () => {
		const drops = createDrops(createRandom(1), everywhere);
		run(drops, FIRST_DROP_DELAY - 0.2);
		expect(drops.drop).toBeUndefined();
		run(drops, 0.4);
		const first = drops.drop;
		expect(first).toBeDefined();
		run(drops, 60);
		expect(drops.drop).toBe(first);
	});

	it('turns the magnet on when taken, for its time', () => {
		const drops = createDrops(createRandom(1), everywhere);
		run(drops, FIRST_DROP_DELAY + 0.2);
		const drop = drops.drop!;
		expect(drops.magnet).toBe(false);
		const events = drops.update(0.1, drop, HOLE_RADIUS);
		expect(events.taken).toBe(drop);
		expect(drops.drop).toBeUndefined();
		expect(drops.magnet).toBe(true);
		run(drops, MAGNET_TIME - 0.3, drop);
		expect(drops.magnet).toBe(true);
		run(drops, 0.4, drop);
		expect(drops.magnet).toBe(false);
	});

	it('drops the next one a while after the last was taken', () => {
		const drops = createDrops(createRandom(1), everywhere);
		run(drops, FIRST_DROP_DELAY + 0.2);
		drops.update(0.1, drops.drop!, HOLE_RADIUS);
		run(drops, NEXT_DROP_DELAY - 0.3, { x: -90, z: -90 });
		expect(drops.drop).toBeUndefined();
		run(drops, 0.5, { x: -90, z: -90 });
		expect(drops.drop).toBeDefined();
	});

	it('keeps trying while no spot is clear', () => {
		let clear = false;
		const drops = createDrops(createRandom(1), () => clear);
		run(drops, FIRST_DROP_DELAY + 2);
		expect(drops.drop).toBeUndefined();
		clear = true;
		run(drops, 1.2);
		expect(drops.drop).toBeDefined();
	});
});
