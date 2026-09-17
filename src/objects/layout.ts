import { createRandom } from '../engine/random';
import { palette } from '../world/palette';
import { PLAYZONE_SIZE } from '../world/zones';
import {
	generateTrunk,
	TRUNK_HALF_WIDTH,
	trunkReach,
	trunkTop,
	type TrunkSpec,
} from './trunk';

type Range = readonly [min: number, max: number];

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

/** A trunk with a crown of leaves on its top, or none: a dead tree. */
export interface TreeSpec extends Placement {
	kind: 'tree';
	trunk: TrunkSpec;
	trunkColor: number;
	leaves: LeafSpec[];
}

/**
 * Seed offset of the trunk shapes' own random sequence: drawing them from the
 * layout's sequence would move every object placed after the first tree.
 */
const TRUNK_SEED_SALT = 0x5bd1e995;

export type ObjectSpec = StackSpec | SphereSpec | TreeSpec;

/**
 * Seeded object layout: the same seed always gives the same playzone. Larger
 * footprints are placed first, so they still find room.
 */
export function generateLayout(seed: number): ObjectSpec[] {
	const random = createRandom(seed);
	const trunkRandom = createRandom(seed ^ TRUNK_SEED_SALT);
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

	/** One leaf capping the trunk's top, the rest ringed just below it. */
	const growCrown = (trunk: TrunkSpec): LeafSpec[] => {
		const { x, y, z } = trunkTop(trunk);
		const count = whole(TREE_LEAVES);
		const turn = random() * Math.PI * 2;
		const cap = within(LEAF_RADIUS);
		const leaves = [
			{ x, y: y + cap * 0.4, z, radius: cap, color: pick(palette.leaves) },
		];
		for (let i = 1; i < count; i++) {
			const radius = within(LEAF_RADIUS);
			const angle = turn + ((i - 1) / (count - 1)) * Math.PI * 2;
			const reach = TRUNK_HALF_WIDTH + radius * 0.5;
			leaves.push({
				x: x + Math.cos(angle) * reach,
				y: y - radius * 0.2,
				z: z + Math.sin(angle) * reach,
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
		const trunk = generateTrunk(trunkRandom);
		const leaves = growCrown(trunk);
		const footprint = Math.max(
			trunkReach(trunk),
			...leaves.map((leaf) => Math.hypot(leaf.x, leaf.z) + leaf.radius)
		);
		const spot = findSpot(footprint);
		if (spot) {
			specs.push({
				kind: 'tree',
				...spot,
				footprint,
				trunk,
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
		const trunk = generateTrunk(trunkRandom);
		const footprint = trunkReach(trunk);
		const spot = findSpot(footprint);
		if (spot) {
			specs.push({
				kind: 'tree',
				...spot,
				footprint,
				trunk,
				trunkColor: palette.deadTrunk,
				leaves: [],
			});
		}
	}

	return specs;
}
