import {
	BufferAttribute,
	CircleGeometry,
	Color,
	Mesh,
	MeshBasicMaterial,
	RingGeometry,
	type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette } from '../world/palette';

/** Radius of the black disc, in m (4 m wide). */
export const HOLE_RADIUS = 2;

/** Width of the yellow ring outside the disc, in m. */
export const RING_WIDTH = 1;

/** Circle segments: smooth edges at the camera's zoom. */
const SEGMENTS = 64;

/** Height above the ground, in m, so the hole never z-fights the terrain. */
const LIFT = 0.02;

/**
 * Black disc and yellow ring merged into one mesh with vertex colors: one draw
 * call. Disc and ring keep separate vertices at the seam, so the color edge
 * stays hard.
 */
export function createHoleMesh(): Mesh {
	const geometry = mergeGeometries([
		withColor(new CircleGeometry(HOLE_RADIUS, SEGMENTS), palette.hole),
		withColor(
			new RingGeometry(HOLE_RADIUS, HOLE_RADIUS + RING_WIDTH, SEGMENTS),
			palette.holeRing
		),
	]);
	geometry.rotateX(-Math.PI / 2);

	const material = new MeshBasicMaterial({ vertexColors: true });
	const mesh = new Mesh(geometry, material);
	mesh.position.y = LIFT;
	return mesh;
}

/** Adds a uniform vertex color (linear, converted from sRGB hex by three). */
function withColor(geometry: BufferGeometry, hex: number): BufferGeometry {
	const { r, g, b } = new Color(hex);
	const count = geometry.getAttribute('position').count;
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
	geometry.setAttribute('color', new BufferAttribute(colors, 3));
	return geometry;
}
