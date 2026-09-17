import { createRandom } from '../../engine/random';
import { PLAYZONE_SIZE } from '../../world/zones';

/** Tile side, in m. */
export const TILE_SIZE = 2;

/** Tile kinds, one byte per tile. */
export const MAIN = 0;
export const ACCENT = 1;

/** Tiles along one playzone side. */
export const TILES_PER_SIDE = PLAYZONE_SIZE / TILE_SIZE;

/** Average tile count per accent patch: how rare patches are. */
const TILES_PER_PATCH = 400;

/** Patch radius range, in tiles. */
const PATCH_RADIUS_MIN = 1.2;
const PATCH_RADIUS_MAX = 2.8;

/**
 * How far, in tiles, a patch edge wobbles in or out per tile, so patches read
 * as blobs rather than circles.
 */
const EDGE_WOBBLE = 0.8;

/**
 * Tile kinds of the playzone, row-major: index `row * TILES_PER_SIDE + col`.
 * Row 0 is the world +z edge, col 0 the world -x edge. Same seed, same layout.
 */
export function generateTileKinds(seed: number): Uint8Array {
	const n = TILES_PER_SIDE;
	const kinds = new Uint8Array(n * n).fill(MAIN);
	const random = createRandom(seed);
	const patches = Math.round((n * n) / TILES_PER_PATCH);

	for (let p = 0; p < patches; p++) {
		const centerCol = random() * n;
		const centerRow = random() * n;
		const radius =
			PATCH_RADIUS_MIN + random() * (PATCH_RADIUS_MAX - PATCH_RADIUS_MIN);
		const reach = radius + EDGE_WOBBLE / 2;

		const rowStart = Math.max(0, Math.floor(centerRow - reach));
		const rowEnd = Math.min(n - 1, Math.floor(centerRow + reach));
		const colStart = Math.max(0, Math.floor(centerCol - reach));
		const colEnd = Math.min(n - 1, Math.floor(centerCol + reach));
		for (let row = rowStart; row <= rowEnd; row++) {
			for (let col = colStart; col <= colEnd; col++) {
				const dx = col + 0.5 - centerCol;
				const dy = row + 0.5 - centerRow;
				const wobble = (random() - 0.5) * EDGE_WOBBLE;
				if (Math.hypot(dx, dy) <= radius + wobble) {
					kinds[row * n + col] = ACCENT;
				}
			}
		}
	}
	return kinds;
}
