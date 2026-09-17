import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

type Range = readonly [min: number, max: number];

/** Trunk height, in m (spec: 8 m high). Shared by dead and live trees. */
export const TRUNK_HEIGHT = 8;

/** Half the trunk's width across its flat faces, in m (spec: 2 m wide). */
export const TRUNK_HALF_WIDTH = 1;

/**
 * How much of each corner of the square section is cut off, in m: four broad
 * faces and four narrow bevels, "almost square" (admin) and eight-sided like
 * the references (`reference/trees/`).
 */
const CHAMFER = 0.3;

/**
 * Root flare, from the references: the section spreads out over the lowest
 * `FLARE_HEIGHT` m, each corner by its own factor, so the base looks rooted.
 */
const FLARE_HEIGHT = 0.8;
const FLARE_SPREAD: Range = [1.2, 1.5];

/** Width at the top, relative to the width just above the flare. */
const TOP_SCALE = 0.85;

/** Heights of the bends between the flare and the top, in m. */
const BENDS: readonly Range[] = [
	[2.8, 3.6],
	[5.2, 6],
];

/**
 * Each bend steps the trunk's axis sideways by `BEND_STEP` m, heading up to
 * `BEND_TURN` rad away from the last step, so the axis curves rather than
 * zigzags. The axis never strays more than `MAX_LEAN` m from the base.
 */
const BEND_STEP: Range = [0.2, 0.4];
const BEND_TURN = Math.PI / 3;
export const MAX_LEAN = 0.6;

/** Twist from base to top, in rad, either way round. */
const TWIST: Range = [0.25, 0.6];

/**
 * Brightness of the cut face on top, as a linear vertex color multiplying the
 * trunk color: lighter wood, as in the references.
 */
const CUT_FACE = 2.2;

/** A horizontal section of a trunk, relative to the trunk base. */
export interface TrunkRing {
	x: number;
	y: number;
	z: number;
	/** Turn about the vertical axis, in rad. */
	twist: number;
	/** Per section corner, how far it reaches relative to the plain section. */
	spread: number[];
}

/** A trunk: its sections from base to top. Straight between them. */
export interface TrunkSpec {
	rings: TrunkRing[];
}

/** The plain section's corners (x, z), in order around the axis. */
const SECTION: readonly (readonly [x: number, z: number])[] = (() => {
	const h = TRUNK_HALF_WIDTH;
	const e = h - CHAMFER;
	return [
		[h, -e],
		[h, e],
		[e, h],
		[-e, h],
		[-h, e],
		[-h, -e],
		[-e, -h],
		[e, -h],
	];
})();

/**
 * A seeded trunk: flared base, straight up to the flare's top, then lightly
 * bent at two heights and at the top, twisting and narrowing on the way.
 */
export function generateTrunk(random: () => number): TrunkSpec {
	const within = ([min, max]: Range) => min + random() * (max - min);
	const turn = random() * Math.PI * 2;
	const twist = within(TWIST) * (random() < 0.5 ? -1 : 1);
	const twistAt = (y: number) => turn + (twist * y) / TRUNK_HEIGHT;
	const scaleAt = (y: number) =>
		1 + ((TOP_SCALE - 1) * (y - FLARE_HEIGHT)) / (TRUNK_HEIGHT - FLARE_HEIGHT);

	const rings: TrunkRing[] = [
		{
			x: 0,
			y: 0,
			z: 0,
			twist: twistAt(0),
			spread: SECTION.map(() => within(FLARE_SPREAD)),
		},
		{
			x: 0,
			y: FLARE_HEIGHT,
			z: 0,
			twist: twistAt(FLARE_HEIGHT),
			spread: SECTION.map(() => 1),
		},
	];
	let x = 0;
	let z = 0;
	let heading = random() * Math.PI * 2;
	for (const y of [...BENDS.map(within), TRUNK_HEIGHT]) {
		heading += (random() * 2 - 1) * BEND_TURN;
		const step = within(BEND_STEP);
		x += Math.cos(heading) * step;
		z += Math.sin(heading) * step;
		const lean = Math.hypot(x, z);
		if (lean > MAX_LEAN) {
			x *= MAX_LEAN / lean;
			z *= MAX_LEAN / lean;
		}
		const scale = scaleAt(y);
		rings.push({
			x,
			y,
			z,
			twist: twistAt(y),
			spread: SECTION.map(() => scale),
		});
	}
	return { rings };
}

/** A ring's corners, relative to the trunk base. */
export function ringCorners(ring: TrunkRing): Vector3[] {
	const cos = Math.cos(ring.twist);
	const sin = Math.sin(ring.twist);
	return SECTION.map(([sx, sz], k) => {
		const spread = ring.spread[k]!;
		const x = sx * spread;
		const z = sz * spread;
		return new Vector3(
			ring.x + x * cos - z * sin,
			ring.y,
			ring.z + x * sin + z * cos
		);
	});
}

/** The trunk's top center, relative to its base: where the crown sits. */
export function trunkTop({ rings }: TrunkSpec): Vector3 {
	const top = rings[rings.length - 1]!;
	return new Vector3(top.x, top.y, top.z);
}

/** Farthest any part of the trunk reaches sideways from its base, in m. */
export function trunkReach({ rings }: TrunkSpec): number {
	return Math.max(
		...rings
			.flatMap(ringCorners)
			.map((corner) => Math.hypot(corner.x, corner.z))
	);
}

/**
 * The trunk's convex pieces, one per straight segment between two rings, as
 * point clouds: its colliders are their hulls.
 */
export function trunkPieces({ rings }: TrunkSpec): Vector3[][] {
	const corners = rings.map(ringCorners);
	return corners.slice(1).map((upper, i) => [...corners[i]!, ...upper]);
}

/**
 * Flat-shaded trunk mesh, relative to its base: every triangle keeps its own
 * normal, for the faceted low-poly look of the references. Unindexed, with a
 * vertex color per triangle: bark 1, the cut face on top lighter.
 */
export function createTrunkGeometry({ rings }: TrunkSpec): BufferGeometry {
	const corners = rings.map(ringCorners);
	const positions: number[] = [];
	const colors: number[] = [];
	const addTriangle = (a: Vector3, b: Vector3, c: Vector3, shade = 1) => {
		for (const point of [a, b, c]) {
			positions.push(point.x, point.y, point.z);
			colors.push(shade, shade, shade);
		}
	};

	const n = SECTION.length;
	// `SECTION` runs so that, for lower corners a, b and upper corners d, c
	// above them, triangles a-d-c and a-c-b face outward.
	for (let s = 0; s + 1 < corners.length; s++) {
		const lower = corners[s]!;
		const upper = corners[s + 1]!;
		for (let k = 0; k < n; k++) {
			const a = lower[k]!;
			const b = lower[(k + 1) % n]!;
			const c = upper[(k + 1) % n]!;
			const d = upper[k]!;
			addTriangle(a, d, c);
			addTriangle(a, c, b);
		}
	}
	const bottom = corners[0]!;
	const top = corners[corners.length - 1]!;
	for (let k = 1; k + 1 < n; k++) {
		addTriangle(bottom[0]!, bottom[k]!, bottom[k + 1]!);
		addTriangle(top[0]!, top[k + 1]!, top[k]!, CUT_FACE);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	geometry.computeVertexNormals();
	return geometry;
}
