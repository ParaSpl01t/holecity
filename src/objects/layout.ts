import { createRandom } from '../engine/random';
import { palette } from '../world/palette';
import { PLAYZONE_SIZE } from '../world/zones';

type Range = readonly [min: number, max: number];

/** Tree trunk, shared by dead and live trees, in m (2 m wide, 8 m high). */
export const TRUNK_RADIUS = 1;
export const TRUNK_HEIGHT = 8;

/** Size ranges from the spec, in m: min inclusive, max exclusive. */
export const CUBE_SIZE: Range = [2, 8];
export const SPHERE_RADIUS: Range = [1, 3];
export const LEAF_RADIUS: Range = [1, 2];

/** Count ranges from the spec, both ends inclusive. */
export const STACK_CUBES: Range = [1, 3];
export const TREE_LEAVES: Range = [3, 4];

/** Objects per kind. Not specified: tunable. */
const COUNTS = { stack: 28, liveTree: 22, sphere: 26, deadTree: 14 } as const;

/** Clear radius around the spawn point (the playzone center), in m. */
export const SPAWN_CLEAR = 14;

/** Minimum gap between two footprints, in m. */
export const GAP = 1.5;

/** Minimum gap between a footprint and the playzone edge, in m. */
export const EDGE_MARGIN = 2;

/** Placement tries per object before it is left out. */
const ATTEMPTS = 60;

/** Where an object stands. `footprint` is the radius of ground it covers. */
interface Placement {
	x: number;
	z: number;
	footprint: number;
}

/** 1-3 identical cubes stacked exactly on top of each other. */
export interface StackSpec extends Placement {
	kind: 'stack';
	yaw: number;
	width: number;
	height: number;
	length: number;
	cubes: number;
	color: number;
}

export interface SphereSpec extends Placement {
	kind: 'sphere';
	radius: number;
	color: number;
}

/** A leaf ball, placed relative to the tree base. */
export interface LeafSpec {
	x: number;
	y: number;
	z: number;
	radius: number;
	color: number;
}

/** A trunk with a crown of leaves, or none: a dead tree. */
export interface TreeSpec extends Placement {
	kind: 'tree';
	trunkColor: number;
	leaves: LeafSpec[];
}

export type ObjectSpec = StackSpec | SphereSpec | TreeSpec;

/**
 * Seeded object layout: the same seed always gives the same playzone. Larger
 * footprints are placed first, so they still find room.
 */
export function generateLayout(seed: number): ObjectSpec[] {
	const random = createRandom(seed);
	const within = ([min, max]: Range) => min + random() * (max - min);
	const whole = ([min, max]: Range) =>
		min + Math.floor(random() * (max - min + 1));
	const pick = (colors: readonly number[]) =>
		colors[Math.floor(random() * colors.length)]!;
	const specs: ObjectSpec[] = [];

	/** A free spot for `footprint`, or undefined once the playzone is crowded. */
	const findSpot = (footprint: number) => {
		const limit = PLAYZONE_SIZE / 2 - EDGE_MARGIN - footprint;
		for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
			const x = (random() * 2 - 1) * limit;
			const z = (random() * 2 - 1) * limit;
			if (Math.hypot(x, z) < SPAWN_CLEAR + footprint) continue;
			const blocked = specs.some(
				(other) =>
					Math.hypot(other.x - x, other.z - z) <
					other.footprint + footprint + GAP
			);
			if (!blocked) return { x, z };
		}
		return undefined;
	};

	/** One leaf capping the trunk, the rest ringed just below it. */
	const growCrown = (): LeafSpec[] => {
		const count = whole(TREE_LEAVES);
		const turn = random() * Math.PI * 2;
		const top = within(LEAF_RADIUS);
		const leaves = [
			{
				x: 0,
				y: TRUNK_HEIGHT + top * 0.4,
				z: 0,
				radius: top,
				color: pick(palette.leaves),
			},
		];
		for (let i = 1; i < count; i++) {
			const radius = within(LEAF_RADIUS);
			const angle = turn + ((i - 1) / (count - 1)) * Math.PI * 2;
			const reach = TRUNK_RADIUS + radius * 0.5;
			leaves.push({
				x: Math.cos(angle) * reach,
				y: TRUNK_HEIGHT - radius * 0.2,
				z: Math.sin(angle) * reach,
				radius,
				color: pick(palette.leaves),
			});
		}
		return leaves;
	};

	for (let i = 0; i < COUNTS.stack; i++) {
		const width = within(CUBE_SIZE);
		const height = within(CUBE_SIZE);
		const length = within(CUBE_SIZE);
		const cubes = whole(STACK_CUBES);
		const yaw = random() * Math.PI * 2;
		const color = pick(palette.toys);
		const footprint = Math.hypot(width, length) / 2;
		const spot = findSpot(footprint);
		if (spot) {
			specs.push({
				kind: 'stack',
				...spot,
				footprint,
				yaw,
				width,
				height,
				length,
				cubes,
				color,
			});
		}
	}

	for (let i = 0; i < COUNTS.liveTree; i++) {
		const leaves = growCrown();
		const footprint = Math.max(
			TRUNK_RADIUS,
			...leaves.map((leaf) => Math.hypot(leaf.x, leaf.z) + leaf.radius)
		);
		const spot = findSpot(footprint);
		if (spot) {
			specs.push({
				kind: 'tree',
				...spot,
				footprint,
				trunkColor: palette.trunk,
				leaves,
			});
		}
	}

	for (let i = 0; i < COUNTS.sphere; i++) {
		const radius = within(SPHERE_RADIUS);
		const color = pick(palette.toys);
		const spot = findSpot(radius);
		if (spot) {
			specs.push({ kind: 'sphere', ...spot, footprint: radius, radius, color });
		}
	}

	for (let i = 0; i < COUNTS.deadTree; i++) {
		const spot = findSpot(TRUNK_RADIUS);
		if (spot) {
			specs.push({
				kind: 'tree',
				...spot,
				footprint: TRUNK_RADIUS,
				trunkColor: palette.deadTrunk,
				leaves: [],
			});
		}
	}

	return specs;
}
