import {
	BufferGeometry,
	Color,
	DataTexture,
	Float32BufferAttribute,
	Group,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	NotEqualStencilFunc,
	PlaneGeometry,
	SRGBColorSpace,
	Vector3,
} from 'three';
import { HOLE_STENCIL } from '../engine/stencil';
import { toonBrightness } from './lighting';
import { palette } from './palette';
import { ACCENT, generateTileKinds, TILES_PER_SIDE } from './tiles';
import { BORDER_HEIGHT, BORDER_WIDTH, PLAYZONE_SIZE, TILE_SIZE } from './zones';

/** Borderzone width, in tiles. */
const BORDER_TILES = BORDER_WIDTH / TILE_SIZE;

/** Tiles along one side of the whole ground: playzone plus both borders. */
const GROUND_TILES = TILES_PER_SIDE + 2 * BORDER_TILES;

/** Half the side of the whole ground, in m. */
const GROUND_HALF = PLAYZONE_SIZE / 2 + BORDER_WIDTH;

/** A corner on the ground plane: world x and z, in m. */
type Corner = readonly [x: number, z: number];

/**
 * Playzone and raised borderzone, sharing one tile texture: two draw calls.
 * Colliders live in the physics simulation.
 * The outzone (sea) is the scene background, so it costs nothing to draw.
 */
export function createTerrain(seed: number): Group {
	const texture = createGroundTexture(seed);
	const terrain = new Group();
	terrain.add(createPlayzone(texture), createBorderzone(texture));
	return terrain;
}

/**
 * One texel per 2 m tile across the whole ground, sampled nearest so tile
 * edges stay crisp at any zoom. Row 0 is the world +z edge, col 0 the world -x
 * edge. The checker parity runs unbroken from the playzone into the border.
 */
function createGroundTexture(seed: number): DataTexture {
	const n = GROUND_TILES;
	const kinds = generateTileKinds(seed);
	const data = new Uint8Array(n * n * 4);
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const tinted = (row + col) % 2 === 1;
			const color = tileColor(
				kinds,
				row - BORDER_TILES,
				col - BORDER_TILES,
				tinted
			);
			const i = (row * n + col) * 4;
			data[i] = (color >> 16) & 0xff;
			data[i + 1] = (color >> 8) & 0xff;
			data[i + 2] = color & 0xff;
			data[i + 3] = 0xff;
		}
	}

	const texture = new DataTexture(data, n, n);
	texture.colorSpace = SRGBColorSpace;
	texture.magFilter = NearestFilter;
	texture.minFilter = NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;
	return texture;
}

/**
 * Tile color at a playzone-relative `row` and `col`. Anything outside the
 * playzone is borderzone concrete.
 */
function tileColor(
	kinds: Uint8Array,
	row: number,
	col: number,
	tinted: boolean
): number {
	const n = TILES_PER_SIDE;
	if (row < 0 || row >= n || col < 0 || col >= n) {
		return tinted ? palette.concreteTint : palette.concrete;
	}
	if (kinds[row * n + col] === ACCENT) {
		return tinted ? palette.accentGreenTint : palette.accentGreen;
	}
	return tinted ? palette.mainGreenTint : palette.mainGreen;
}

/** Ground texture UV of a world x/z point. */
function groundUv(x: number, z: number): [u: number, v: number] {
	const size = 2 * GROUND_HALF;
	return [(x + GROUND_HALF) / size, (GROUND_HALF - z) / size];
}

/** UV of a plain (untinted) concrete texel: the ground's corner tile. */
const PLAIN_CONCRETE_UV: [u: number, v: number] = [
	0.5 / GROUND_TILES,
	0.5 / GROUND_TILES,
];

/**
 * One quad for the whole playzone at ground level. It skips the pixels the
 * hole marks in the stencil buffer, which is what opens the hole (see
 * `player/hole.ts`).
 */
function createPlayzone(texture: DataTexture): Mesh {
	const geometry = new PlaneGeometry(PLAYZONE_SIZE, PLAYZONE_SIZE);
	geometry.rotateX(-Math.PI / 2);
	const position = geometry.getAttribute('position');
	const uv = geometry.getAttribute('uv');
	for (let i = 0; i < position.count; i++) {
		uv.setXY(i, ...groundUv(position.getX(i), position.getZ(i)));
	}
	const material = new MeshBasicMaterial({
		map: texture,
		stencilWrite: true,
		stencilRef: HOLE_STENCIL,
		stencilFunc: NotEqualStencilFunc,
	});
	return new Mesh(geometry, material);
}

/**
 * Concrete path raised `BORDER_HEIGHT` above the playzone: a top ring plus
 * walls on its inner and outer edges, in one mesh. The top samples the tile
 * texture; walls sample a plain concrete texel, shaded per facing through
 * vertex colors with the objects' toon light. Nothing overlaps the playzone,
 * so no pixel is drawn twice. Not stencil-tested: where the hole reaches
 * under the path, the path covers it (admin decision).
 */
function createBorderzone(texture: DataTexture): Mesh {
	const positions: number[] = [];
	const uvs: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];

	/** Adds a quad whose corners run counter-clockwise seen from its front. */
	const addQuad = (
		corners: [x: number, y: number, z: number][],
		shade: Color,
		uvOf: (x: number, z: number) => [u: number, v: number]
	): void => {
		const base = positions.length / 3;
		for (const [x, y, z] of corners) {
			positions.push(x, y, z);
			uvs.push(...uvOf(x, z));
			colors.push(shade.r, shade.g, shade.b);
		}
		indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
	};

	const lit = new Color(1, 1, 1);
	const wallShade = (from: Corner, to: Corner): Color => {
		// A wall from `from` to `to` faces (-dz, dx); see the loops below.
		const facing = new Vector3(-(to[1] - from[1]), 0, to[0] - from[0]);
		const brightness = toonBrightness(facing.normalize());
		return new Color(brightness, brightness, brightness);
	};
	const plainConcrete = () => PLAIN_CONCRETE_UV;
	const top = BORDER_HEIGHT;

	// Both loops run the same way around. A wall from `a` to `b` faces
	// (-dz, dx), so walks along the inner loop face the playzone and walks
	// along the outer loop in reverse face the sea.
	const inner = squareCorners(PLAYZONE_SIZE / 2);
	const outer = squareCorners(GROUND_HALF);
	for (let k = 0; k < 4; k++) {
		const i0 = inner[k]!;
		const i1 = inner[(k + 1) % 4]!;
		const o0 = outer[k]!;
		const o1 = outer[(k + 1) % 4]!;

		addQuad(
			[
				[i0[0], top, i0[1]],
				[i1[0], top, i1[1]],
				[o1[0], top, o1[1]],
				[o0[0], top, o0[1]],
			],
			lit,
			groundUv
		);
		addQuad(
			[
				[i0[0], 0, i0[1]],
				[i1[0], 0, i1[1]],
				[i1[0], top, i1[1]],
				[i0[0], top, i0[1]],
			],
			wallShade(i0, i1),
			plainConcrete
		);
		addQuad(
			[
				[o1[0], 0, o1[1]],
				[o0[0], 0, o0[1]],
				[o0[0], top, o0[1]],
				[o1[0], top, o1[1]],
			],
			wallShade(o1, o0),
			plainConcrete
		);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	geometry.setIndex(indices);
	geometry.computeBoundingSphere();

	const material = new MeshBasicMaterial({ map: texture, vertexColors: true });
	return new Mesh(geometry, material);
}

/** Square corners around the origin, all loops wound the same way. */
function squareCorners(half: number): Corner[] {
	return [
		[-half, -half],
		[half, -half],
		[half, half],
		[-half, half],
	];
}
