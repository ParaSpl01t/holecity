import { Triangle, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createRandom } from '../engine/random';
import { HOLE_RADIUS } from '../player/dimensions';
import {
	createTrunkGeometry,
	generateTrunk,
	MAX_LEAN,
	TRUNK_HEIGHT,
	trunkPieces,
	trunkReach,
	trunkTop,
	type TrunkSpec,
} from './trunk';

const SEEDS = 300;
const trunks: TrunkSpec[] = Array.from({ length: SEEDS }, (_, seed) =>
	generateTrunk(createRandom(seed))
);

describe('generateTrunk', () => {
	it('gives the same trunk for the same seed', () => {
		expect(generateTrunk(createRandom(9))).toEqual(
			generateTrunk(createRandom(9))
		);
	});

	it('stands on its base and rises to the full height', () => {
		for (const trunk of trunks) {
			const [base] = trunk.rings;
			expect(base).toMatchObject({ x: 0, y: 0, z: 0 });
			expect(trunkTop(trunk).y).toBe(TRUNK_HEIGHT);
			trunk.rings.slice(1).forEach((ring, i) => {
				expect(ring.y).toBeGreaterThan(trunk.rings[i]!.y);
			});
		}
	});

	it('bends only lightly', () => {
		for (const trunk of trunks) {
			for (const ring of trunk.rings) {
				expect(Math.hypot(ring.x, ring.z)).toBeLessThanOrEqual(MAX_LEAN + 1e-9);
			}
		}
	});

	it('fits the default opening standing upright over its base', () => {
		for (const trunk of trunks) {
			expect(trunkReach(trunk)).toBeLessThan(HOLE_RADIUS - 0.1);
		}
	});

	it('is one convex piece per segment between two rings', () => {
		const trunk = trunks[0]!;
		const pieces = trunkPieces(trunk);
		expect(pieces).toHaveLength(trunk.rings.length - 1);
		for (const piece of pieces) expect(piece).toHaveLength(16);
	});
});

describe('createTrunkGeometry', () => {
	it('faces every side outward, the top up and the bottom down', () => {
		const trunk = trunks[0]!;
		const position = createTrunkGeometry(trunk).getAttribute('position');
		const triangle = new Triangle();
		const normal = new Vector3();
		const middle = new Vector3();
		const axis = new Vector3();
		for (let i = 0; i < position.count; i += 3) {
			triangle.setFromAttributeAndIndices(position, i, i + 1, i + 2);
			triangle.getNormal(normal);
			triangle.getMidpoint(middle);
			if (Math.abs(normal.y) > 0.99) {
				// A cap: up at the top, down at the bottom.
				expect(Math.sign(normal.y)).toBe(middle.y > 1 ? 1 : -1);
				continue;
			}
			// A side: away from the axis at its height.
			const rings = trunk.rings;
			const upper = rings.findIndex((ring) => ring.y >= middle.y);
			const a = rings[Math.max(upper - 1, 0)]!;
			const b = rings[upper]!;
			const t = b.y === a.y ? 0 : (middle.y - a.y) / (b.y - a.y);
			axis.set(a.x + (b.x - a.x) * t, middle.y, a.z + (b.z - a.z) * t);
			expect(normal.dot(middle.sub(axis))).toBeGreaterThan(0);
		}
	});
});
