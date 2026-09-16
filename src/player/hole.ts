import {
	AlwaysStencilFunc,
	BackSide,
	BufferAttribute,
	BufferGeometry,
	CircleGeometry,
	Color,
	CylinderGeometry,
	EqualStencilFunc,
	Group,
	Mesh,
	MeshBasicMaterial,
	Plane,
	ReplaceStencilOp,
	RingGeometry,
	Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOLE_STENCIL } from '../engine/stencil';
import { palette } from '../world/palette';
import { BORDER_WIDTH, PLAYZONE_SIZE } from '../world/zones';
import { ABYSS_DEPTH, GROUND_THICKNESS, RING_WIDTH } from './dimensions';

/** Circle segments: smooth edges at the camera's zoom. */
const SEGMENTS = 64;

/** Ring height above the ground, in m, so it never z-fights the terrain. */
const RING_LIFT = 0.02;

/**
 * Radius of the void's backdrop, in m: wide enough to fill every view through
 * the opening. The steepest ray the camera casts is ~66 deg off vertical, which
 * at `ABYSS_DEPTH` lands ~54 m to the side.
 */
const BACKDROP_RADIUS = 80;

/**
 * Planes bounding the land (playzone plus borderzone). Nothing of the hole is
 * drawn over the outzone, whatever its size.
 */
const LAND_HALF = PLAYZONE_SIZE / 2 + BORDER_WIDTH;
const LAND_CLIP = [
	new Plane(new Vector3(1, 0, 0), LAND_HALF),
	new Plane(new Vector3(-1, 0, 0), LAND_HALF),
	new Plane(new Vector3(0, 0, 1), LAND_HALF),
	new Plane(new Vector3(0, 0, -1), LAND_HALF),
];

export interface HoleView {
	readonly object: Group;
	moveTo(x: number, z: number): void;
	setRadius(radius: number): void;
}

/**
 * The hole as seen: a small opening into empty void. An invisible disc marks
 * its pixels in the stencil buffer; the playzone skips them (see
 * `world/terrain.ts`), and through them show the opening's short edge, black
 * void, and whatever is falling into it. The yellow ring is the rim. The
 * raised borderzone is not stencil-tested, so it covers the hole where they
 * overlap.
 */
export function createHoleView(radius: number): HoleView {
	const mask = new Mesh(
		flatDisc(),
		new MeshBasicMaterial({
			colorWrite: false,
			depthWrite: false,
			stencilWrite: true,
			stencilRef: HOLE_STENCIL,
			stencilFunc: AlwaysStencilFunc,
			stencilZPass: ReplaceStencilOp,
			clippingPlanes: LAND_CLIP,
		})
	);
	// Before everything else, so the stencil is set when the ground draws.
	mask.renderOrder = -1;

	const abyss = new Mesh(
		new BufferGeometry(),
		new MeshBasicMaterial({
			vertexColors: true,
			side: BackSide,
			stencilWrite: true,
			stencilRef: HOLE_STENCIL,
			stencilFunc: EqualStencilFunc,
		})
	);

	const ring = new Mesh(
		new BufferGeometry(),
		new MeshBasicMaterial({
			color: palette.holeRing,
			clippingPlanes: LAND_CLIP,
		})
	);
	ring.position.y = RING_LIFT;

	const object = new Group();
	object.add(mask, abyss, ring);

	const view: HoleView = {
		object,
		moveTo(x, z) {
			object.position.set(x, 0, z);
		},
		setRadius(value) {
			mask.scale.set(value, 1, value);
			abyss.geometry.dispose();
			abyss.geometry = createAbyssGeometry(value);
			ring.geometry.dispose();
			ring.geometry = new RingGeometry(value, value + RING_WIDTH, SEGMENTS);
			ring.geometry.rotateX(-Math.PI / 2);
		},
	};
	view.setRadius(radius);
	return view;
}

/** Unit disc lying flat, facing up. */
function flatDisc(): BufferGeometry {
	const disc = new CircleGeometry(1, SEGMENTS);
	disc.rotateX(-Math.PI / 2);
	return disc;
}

/**
 * What the opening shows, seen from above, in one draw call: its edge, as deep
 * as the ground is thick, fading from `holeWall` to `hole`; then a black
 * backdrop far below. Both are seen from inside or above, so they draw back
 * faces: the edge faces inward, the backdrop is flipped to face down.
 */
function createAbyssGeometry(radius: number): BufferGeometry {
	const edge = new CylinderGeometry(
		radius,
		radius,
		GROUND_THICKNESS,
		SEGMENTS,
		1,
		true
	);
	edge.translate(0, -GROUND_THICKNESS / 2, 0);
	const backdrop = new CircleGeometry(BACKDROP_RADIUS, SEGMENTS);
	backdrop.rotateX(Math.PI / 2);
	backdrop.translate(0, -ABYSS_DEPTH, 0);

	const top = new Color(palette.holeWall);
	const bottom = new Color(palette.hole);
	const shade = new Color();
	for (const [part, depth] of [
		[edge, GROUND_THICKNESS],
		[backdrop, ABYSS_DEPTH],
	] as const) {
		const position = part.getAttribute('position');
		const colors = new Float32Array(position.count * 3);
		for (let i = 0; i < position.count; i++) {
			shade.lerpColors(top, bottom, Math.min(-position.getY(i) / depth, 1));
			colors.set([shade.r, shade.g, shade.b], i * 3);
		}
		part.setAttribute('color', new BufferAttribute(colors, 3));
	}
	return mergeGeometries([edge, backdrop]);
}
