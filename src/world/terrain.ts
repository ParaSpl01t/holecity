import {
	DataTexture,
	Group,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	Path,
	PlaneGeometry,
	SRGBColorSpace,
	Shape,
	ShapeGeometry,
} from 'three';
import { palette } from './palette';
import { ACCENT, generateTileKinds, TILES_PER_SIDE } from './tiles';
import { BORDER_WIDTH, PLAYZONE_SIZE } from './zones';

/**
 * Playzone and borderzone meshes, two draw calls. The outzone (sea) is the
 * scene background, so it costs nothing to draw.
 */
export function createTerrain(seed: number): Group {
	const terrain = new Group();
	terrain.add(createPlayzone(seed), createBorderzone());
	return terrain;
}

/**
 * One quad for the whole playzone. Tiles live in a data texture, one texel per
 * tile, sampled nearest so tile edges stay crisp at any zoom.
 */
function createPlayzone(seed: number): Mesh {
	const n = TILES_PER_SIDE;
	const data = new Uint8Array(n * n * 4);
	generateTileKinds(seed).forEach((kind, i) => {
		const tinted = (Math.floor(i / n) + (i % n)) % 2 === 1;
		const color =
			kind === ACCENT
				? tinted
					? palette.accentGreenTint
					: palette.accentGreen
				: tinted
					? palette.mainGreenTint
					: palette.mainGreen;
		data[i * 4] = (color >> 16) & 0xff;
		data[i * 4 + 1] = (color >> 8) & 0xff;
		data[i * 4 + 2] = color & 0xff;
		data[i * 4 + 3] = 0xff;
	});

	const texture = new DataTexture(data, n, n);
	texture.colorSpace = SRGBColorSpace;
	texture.magFilter = NearestFilter;
	texture.minFilter = NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;

	const geometry = new PlaneGeometry(PLAYZONE_SIZE, PLAYZONE_SIZE);
	// Lay flat, facing up. Texture row 0 (v = 0) lands on the world +z edge.
	geometry.rotateX(-Math.PI / 2);
	return new Mesh(geometry, new MeshBasicMaterial({ map: texture }));
}

/**
 * Concrete path as one square with a square hole, so no pixel of the
 * playzone is drawn twice.
 */
function createBorderzone(): Mesh {
	const inner = PLAYZONE_SIZE / 2;
	const outer = inner + BORDER_WIDTH;
	const shape = new Shape()
		.moveTo(-outer, -outer)
		.lineTo(outer, -outer)
		.lineTo(outer, outer)
		.lineTo(-outer, outer);
	shape.holes.push(
		new Path()
			.moveTo(-inner, -inner)
			.lineTo(-inner, inner)
			.lineTo(inner, inner)
			.lineTo(inner, -inner)
	);

	const geometry = new ShapeGeometry(shape);
	geometry.rotateX(-Math.PI / 2);
	return new Mesh(geometry, new MeshBasicMaterial({ color: palette.concrete }));
}
