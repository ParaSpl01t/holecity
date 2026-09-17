import { describe, expect, it } from 'vitest';
import { debugEnvironment } from '../environments/debug/debug';
import { PLAYZONE_SIZE } from '../world/zones';
import {
	CUBE_SIZE,
	EDGE_MARGIN,
	GAP,
	generateLayout,
	LEAF_RADIUS,
	SPAWN_CLEAR,
	SPHERE_RADIUS,
	STACK_CUBES,
	TREE_LEAVES,
	type ObjectSpec,
} from './layout';

const layout = generateLayout(debugEnvironment.seed);
const inRange = (value: number, [min, max]: readonly [number, number]) =>
	value >= min && value <= max;

describe('generateLayout', () => {
	it('gives the same layout for the same seed', () => {
		expect(generateLayout(5)).toEqual(generateLayout(5));
	});

	it('places every kind of object', () => {
		const has = (test: (spec: ObjectSpec) => boolean) => layout.some(test);
		expect(has((spec) => spec.kind === 'stack')).toBe(true);
		expect(has((spec) => spec.kind === 'sphere')).toBe(true);
		expect(has((spec) => spec.kind === 'tree' && spec.leaves.length > 0)).toBe(
			true
		);
		expect(
			has((spec) => spec.kind === 'tree' && spec.leaves.length === 0)
		).toBe(true);
	});

	it('keeps sizes and counts inside the spec ranges', () => {
		for (const spec of layout) {
			if (spec.kind === 'stack') {
				expect(inRange(spec.width, CUBE_SIZE)).toBe(true);
				expect(inRange(spec.height, CUBE_SIZE)).toBe(true);
				expect(inRange(spec.length, CUBE_SIZE)).toBe(true);
				expect(inRange(spec.cubes, STACK_CUBES)).toBe(true);
			} else if (spec.kind === 'sphere') {
				expect(inRange(spec.radius, SPHERE_RADIUS)).toBe(true);
			} else if (spec.leaves.length > 0) {
				expect(inRange(spec.leaves.length, TREE_LEAVES)).toBe(true);
				for (const leaf of spec.leaves) {
					expect(inRange(leaf.radius, LEAF_RADIUS)).toBe(true);
				}
			}
		}
	});

	it('keeps objects apart, off the spawn and inside the playzone', () => {
		const limit = PLAYZONE_SIZE / 2 - EDGE_MARGIN;
		layout.forEach((spec, i) => {
			expect(Math.hypot(spec.x, spec.z)).toBeGreaterThanOrEqual(
				SPAWN_CLEAR + spec.footprint
			);
			expect(Math.abs(spec.x) + spec.footprint).toBeLessThanOrEqual(limit);
			expect(Math.abs(spec.z) + spec.footprint).toBeLessThanOrEqual(limit);
			for (const other of layout.slice(i + 1)) {
				expect(
					Math.hypot(spec.x - other.x, spec.z - other.z)
				).toBeGreaterThanOrEqual(spec.footprint + other.footprint + GAP);
			}
		});
	});
});
