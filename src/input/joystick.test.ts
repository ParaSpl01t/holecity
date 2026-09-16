import { describe, expect, it } from 'vitest';
import { DEAD_ZONE, RADIUS, stickToDirection } from './joystick';

const read = (dx: number, dy: number) =>
	stickToDirection(dx, dy, { x: 0, z: 0 });

describe('stickToDirection', () => {
	it('rests while the thumb stays inside the dead zone', () => {
		expect(read(0, 0)).toEqual({ x: 0, z: 0 });
		expect(read(RADIUS * DEAD_ZONE * 0.9, 0)).toEqual({ x: 0, z: 0 });
	});

	it('maps screen right to +x and screen down to +z', () => {
		expect(read(RADIUS, 0)).toEqual({ x: 1, z: 0 });
		expect(read(0, RADIUS)).toEqual({ x: 0, z: 1 });
	});

	it('rises from zero at the dead zone edge to full at the rim', () => {
		const { x } = read(RADIUS * (DEAD_ZONE + (1 - DEAD_ZONE) / 2), 0);
		expect(x).toBeCloseTo(0.5);
	});

	it('caps at full speed when dragged past the rim', () => {
		const { x, z } = read(RADIUS * 3, -RADIUS * 4);
		expect(Math.hypot(x, z)).toBeCloseTo(1);
		expect(x).toBeCloseTo(0.6);
		expect(z).toBeCloseTo(-0.8);
	});
});
