import { describe, expect, it } from 'vitest';
import { PLAYZONE_SIZE } from '../world/zones';
import { HOLE_SPEED, moveHole, type GroundVector } from './movement';

const at = (x: number, z: number): GroundVector => ({ x, z });

describe('moveHole', () => {
	it('moves at top speed along a unit direction', () => {
		const position = at(0, 0);
		moveHole(position, at(1, 0), 0.5);
		expect(position).toEqual(at(HOLE_SPEED * 0.5, 0));
	});

	it('scales speed by direction length', () => {
		const position = at(0, 0);
		moveHole(position, at(0, -0.25), 1);
		expect(position).toEqual(at(0, -HOLE_SPEED * 0.25));
	});

	it('reaches every playzone corner and stays there', () => {
		const half = PLAYZONE_SIZE / 2;
		const corners = [
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		] as const;
		for (const [sx, sz] of corners) {
			const position = at(0, 0);
			const diagonal = at(sx * Math.SQRT1_2, sz * Math.SQRT1_2);
			// 40 s of travel: far more than the ~12 s a corner takes.
			for (let i = 0; i < 400; i++) moveHole(position, diagonal, 0.1);
			expect(position).toEqual(at(sx * half, sz * half));
		}
	});

	it('slides along an edge instead of stopping', () => {
		const half = PLAYZONE_SIZE / 2;
		const position = at(half - 1, 0);
		moveHole(position, at(Math.SQRT1_2, Math.SQRT1_2), 1);
		expect(position.x).toBe(half);
		expect(position.z).toBeCloseTo(HOLE_SPEED * Math.SQRT1_2);
	});
});
