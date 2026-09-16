import { describe, expect, it } from 'vitest';
import { keysToDirection } from './keyboard';

const read = (...codes: string[]) =>
	keysToDirection(new Set(codes), { x: 0, z: 0 });

describe('keysToDirection', () => {
	it('is still with no keys held', () => {
		expect(read()).toEqual({ x: 0, z: 0 });
	});

	it('maps WASD to screen directions (screen-up is world -z)', () => {
		expect(read('KeyW')).toEqual({ x: 0, z: -1 });
		expect(read('KeyS')).toEqual({ x: 0, z: 1 });
		expect(read('KeyA')).toEqual({ x: -1, z: 0 });
		expect(read('KeyD')).toEqual({ x: 1, z: 0 });
	});

	it('keeps diagonals at full speed, not faster', () => {
		const { x, z } = read('KeyW', 'KeyD');
		expect(Math.hypot(x, z)).toBeCloseTo(1);
		expect(x).toBeCloseTo(Math.SQRT1_2);
		expect(z).toBeCloseTo(-Math.SQRT1_2);
	});

	it('cancels opposite keys', () => {
		expect(read('KeyA', 'KeyD')).toEqual({ x: 0, z: 0 });
	});

	it('ignores keys that do not move', () => {
		expect(read('KeyQ', 'ArrowUp', 'Space')).toEqual({ x: 0, z: 0 });
	});
});
