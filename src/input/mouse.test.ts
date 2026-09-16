import { describe, expect, it } from 'vitest';
import { DEAD_ZONE, offsetToDirection, RAMP } from './mouse';

const read = (dx: number, dz: number) =>
	offsetToDirection(dx, dz, { x: 0, z: 0 });

describe('offsetToDirection', () => {
	it('rests with the cursor inside the dead zone', () => {
		expect(read(0, 0)).toEqual({ x: 0, z: 0 });
		expect(read(0, DEAD_ZONE * 0.9)).toEqual({ x: 0, z: 0 });
	});

	it('ramps speed up with distance past the dead zone', () => {
		const { x, z } = read(DEAD_ZONE + RAMP / 2, 0);
		expect(x).toBeCloseTo(0.5);
		expect(z).toBe(0);
	});

	it('caps at full speed, pointing at the cursor', () => {
		const { x, z } = read(-30, 40);
		expect(Math.hypot(x, z)).toBeCloseTo(1);
		expect(x).toBeCloseTo(-0.6);
		expect(z).toBeCloseTo(0.8);
	});
});
