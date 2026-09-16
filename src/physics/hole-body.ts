import type { Collider, ColliderDesc, World } from '@dimforge/rapier3d-compat';
import { GROUND_THICKNESS } from '../player/dimensions';
import { FRICTION, type Rapier } from './physics';

/**
 * Ground reach around the hole, in m: covers the playzone from any hole
 * position. The farthest an object can be from the hole is corner to opposite
 * corner of the 200 m playzone: 200 * sqrt(2) = ~283 m.
 */
const GROUND_REACH = 300;

/** Band of wedges around the collar, in m, before four slabs take over. */
const WEDGE_BAND = 10;
const WEDGE_SEGMENTS = 32;

/** How far wedges reach past the band, in m, to overlap the slabs. */
const WEDGE_OVERLAP = 0.5;

/** Radial width of the collar, in m. Only its inner face matters. */
const COLLAR_WIDTH = 1;
const COLLAR_SEGMENTS = 24;

/**
 * How far the collar's top sits below the surface, and how far past it the
 * ground's opening starts, in m. Something merely resting next to the hole
 * then only ever touches the ground, which has no velocity; only a part
 * actually hanging into the opening meets the moving collar (admin report,
 * 2026-09-16: the collar's top and outer corner struck resting objects "like
 * a carrom board piece").
 */
const COLLAR_DROP = 0.05;

/**
 * Half-height of the zone, in m, whose objects are woken when the hole moves.
 * Sleeping bodies would otherwise hover over the opening.
 */
const WAKE_HALF_HEIGHT = 20;
const WAKE_MARGIN = 10;

export interface HoleBody {
	/** Moves (and resizes) the opening. Called once per physics step. */
	update(x: number, z: number, radius: number): void;
	/** Whether a collider is part of the ground around the opening. */
	isRim(handle: number): boolean;
}

/**
 * The hole as physics sees it: a small opening in thin, solid ground, with
 * empty void below (admin, 2026-09-16). Nothing to hit under the surface but
 * other objects.
 *
 * Ground: wedges around the opening and four slabs beyond, on a kinematic body
 * teleported with the hole. Teleported, never moved with a velocity, so it
 * does not drag resting objects along through friction.
 *
 * Collar: the opening's side, a ring just below the surface down to the
 * ground's underside, on a second kinematic body that does move with a
 * velocity. It pushes anything hanging into the opening along with the hole,
 * so nothing passes through the edge. It is frictionless, so it pushes but
 * never drags.
 */
export function createHoleBody(rapier: Rapier, world: World): HoleBody {
	const ground = world.createRigidBody(
		rapier.RigidBodyDesc.kinematicPositionBased()
	);
	const collar = world.createRigidBody(
		rapier.RigidBodyDesc.kinematicPositionBased()
	);
	let colliders: Collider[] = [];
	const rimHandles = new Set<number>();
	let wakeZone = new rapier.Cylinder(WAKE_HALF_HEIGHT, WAKE_MARGIN);
	let currentX = Number.NaN;
	let currentZ = Number.NaN;
	let currentRadius = Number.NaN;

	const rebuild = (radius: number) => {
		for (const collider of colliders) world.removeCollider(collider, false);
		rimHandles.clear();
		colliders = [
			...groundDescs(rapier, radius + COLLAR_DROP).map((desc) =>
				world.createCollider(desc.setFriction(FRICTION), ground)
			),
			...collarDescs(rapier, radius).map((desc) =>
				world.createCollider(
					desc
						.setFriction(0)
						.setFrictionCombineRule(rapier.CoefficientCombineRule.Min),
					collar
				)
			),
		];
		for (const collider of colliders) rimHandles.add(collider.handle);
		wakeZone = new rapier.Cylinder(WAKE_HALF_HEIGHT, radius + WAKE_MARGIN);
	};

	return {
		update(x, z, radius) {
			const center = { x, y: 0, z };
			collar.setNextKinematicTranslation(center);
			if (x === currentX && z === currentZ && radius === currentRadius) return;
			if (radius !== currentRadius) rebuild(radius);
			currentX = x;
			currentZ = z;
			currentRadius = radius;
			ground.setTranslation(center, false);
			world.intersectionsWithShape(
				center,
				{ x: 0, y: 0, z: 0, w: 1 },
				wakeZone,
				(collider) => {
					collider.parent()?.wakeUp();
					return true;
				}
			);
		},
		isRim: (handle) => rimHandles.has(handle),
	};
}

/**
 * Ground with a round opening of `opening` radius: wedges out past
 * `WEDGE_BAND`, then four slabs framing a square the wedges fully cover (its
 * corners sit on the band's outer circle).
 */
function groundDescs(rapier: Rapier, opening: number): ColliderDesc[] {
	const band = opening + WEDGE_BAND;
	const reach = band + WEDGE_OVERLAP;
	const descs: ColliderDesc[] = [];
	for (let s = 0; s < WEDGE_SEGMENTS; s++) {
		const from = (s / WEDGE_SEGMENTS) * Math.PI * 2;
		const to = ((s + 1) / WEDGE_SEGMENTS) * Math.PI * 2;
		const points: number[] = [];
		for (const [r, angle] of [
			[opening, from],
			[opening, to],
			[reach, from],
			[reach, to],
		] as const) {
			for (const y of [0, -GROUND_THICKNESS]) {
				points.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
			}
		}
		const wedge = rapier.ColliderDesc.convexHull(new Float32Array(points));
		if (!wedge) throw new Error('ground wedge hull could not be built');
		descs.push(wedge);
	}

	const inner = band / Math.SQRT2;
	const halfDepth = GROUND_THICKNESS / 2;
	const middle = (GROUND_REACH + inner) / 2;
	const halfSpan = (GROUND_REACH - inner) / 2;
	const slabs = [
		[0, -middle, GROUND_REACH, halfSpan],
		[0, middle, GROUND_REACH, halfSpan],
		[-middle, 0, halfSpan, inner],
		[middle, 0, halfSpan, inner],
	] as const;
	for (const [x, z, halfX, halfZ] of slabs) {
		descs.push(
			rapier.ColliderDesc.cuboid(halfX, halfDepth, halfZ).setTranslation(
				x,
				-halfDepth,
				z
			)
		);
	}
	return descs;
}

/**
 * The collar: slabs from `COLLAR_DROP` below the surface to the ground's
 * underside, whose inner faces enclose a circle of `radius`, overlapping at
 * the joints.
 */
function collarDescs(rapier: Rapier, radius: number): ColliderDesc[] {
	const halfHeight = (GROUND_THICKNESS - COLLAR_DROP) / 2;
	const top = -COLLAR_DROP;
	const center = radius + COLLAR_WIDTH / 2;
	const halfLength =
		(radius + COLLAR_WIDTH) * Math.tan(Math.PI / COLLAR_SEGMENTS);
	return Array.from({ length: COLLAR_SEGMENTS }, (_, s) => {
		const angle = (s / COLLAR_SEGMENTS) * Math.PI * 2;
		// Turns the slab's local +z to point outward from the axis.
		const yaw = Math.PI / 2 - angle;
		return rapier.ColliderDesc.cuboid(halfLength, halfHeight, COLLAR_WIDTH / 2)
			.setTranslation(
				Math.cos(angle) * center,
				top - halfHeight,
				Math.sin(angle) * center
			)
			.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
	});
}
