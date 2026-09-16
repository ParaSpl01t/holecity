import { describe, expect, it } from 'vitest';
import { ACCENT, generateTileKinds, MAIN, TILES_PER_SIDE } from './tiles';
import { PLAYZONE_SEED } from './zones';

/** FNV-1a over the bytes: a short fingerprint of a whole layout. */
function fingerprint(bytes: Uint8Array): string {
	let hash = 0x811c9dc5;
	for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
	return hash.toString(16);
}

describe('generateTileKinds', () => {
	it('holds one kind per playzone tile', () => {
		const kinds = generateTileKinds(PLAYZONE_SEED);
		expect(kinds).toHaveLength(TILES_PER_SIDE ** 2);
		expect(kinds.every((kind) => kind === MAIN || kind === ACCENT)).toBe(true);
	});

	it('gives the same layout for the same seed', () => {
		expect(generateTileKinds(7)).toEqual(generateTileKinds(7));
	});

	it('gives a different layout for a different seed', () => {
		expect(generateTileKinds(7)).not.toEqual(generateTileKinds(8));
	});

	it('keeps accent patches occasional', () => {
		const kinds = generateTileKinds(PLAYZONE_SEED);
		const share = kinds.filter((kind) => kind === ACCENT).length / kinds.length;
		expect(share).toBeGreaterThan(0.01);
		expect(share).toBeLessThan(0.1);
	});

	it('keeps the shipped layout stable across releases', () => {
		// Changing the generator, or the order it draws random numbers, moves
		// every patch players have seen. Update deliberately with `vitest -u`.
		expect(fingerprint(generateTileKinds(PLAYZONE_SEED))).toMatchInlineSnapshot(
			`"33aef844"`
		);
	});
});
