import type { World } from '@dimforge/rapier3d-compat';
import type { Scene } from 'three';
import type { Environment } from '../environments/environment';
import type { ObjectSpec } from '../objects/layout';
import {
	createObjects,
	type BodySnapshot,
	type HoleState,
} from '../objects/objects';
import type { GroundVector } from '../player/movement';
import { BORDER_WIDTH, PLAYZONE_SIZE } from '../world/zones';
import { createHoleBody } from './hole-body';
import { createWorld, FRICTION, STEP, type Rapier } from './physics';

/** Most physics steps per frame: past it the world slows instead of spiraling. */
const MAX_STEPS = 4;

export interface Simulation {
	/** Steps physics to catch up with `dt`, then draws the objects. */
	update(dt: number, hole: GroundVector): void;
	setHoleRadius(radius: number): void;
	/** Objects not yet swallowed. */
	readonly remaining: number;
	/** State of the objects left: for tests and debugging. */
	snapshot(): BodySnapshot[];
}

/**
 * Physics world: the ground around the opening and its collar, the raised
 * borderzone, and every object. Fixed steps, drawn interpolated between the
 * last two.
 */
export function createSimulation(
	rapier: Rapier,
	scene: Scene,
	environment: Environment,
	specs: ObjectSpec[],
	holeRadius: number
): Simulation {
	const world = createWorld(rapier);
	const events = new rapier.EventQueue(true);
	addBorderColliders(rapier, world, environment.borderHeight);
	const holeBody = createHoleBody(rapier, world);
	const objects = createObjects(rapier, world, scene, specs);
	const hole: HoleState = { x: 0, z: 0, radius: holeRadius };
	let accumulator = 0;

	return {
		update(dt, position) {
			hole.x = position.x;
			hole.z = position.z;
			accumulator += dt;
			let steps = 0;
			while (accumulator >= STEP && steps < MAX_STEPS) {
				holeBody.update(hole.x, hole.z, hole.radius);
				objects.beforeStep();
				world.step(events);
				events.drainContactForceEvents((event) => {
					const collider1 = event.collider1();
					const collider2 = event.collider2();
					objects.push(
						collider1,
						collider2,
						event.totalForceMagnitude(),
						event.maxForceDirection(),
						holeBody.isRim(collider1) || holeBody.isRim(collider2)
					);
				});
				objects.afterStep(hole);
				accumulator -= STEP;
				steps++;
			}
			// Behind by more than the step cap: drop the backlog, don't chase it.
			if (accumulator >= STEP) accumulator = 0;
			objects.draw(accumulator / STEP);
		},
		setHoleRadius(radius) {
			hole.radius = radius;
		},
		get remaining() {
			return objects.count();
		},
		snapshot: () => objects.snapshot(),
	};
}

/** The raised borderzone as four static slabs around the playzone. */
function addBorderColliders(
	rapier: Rapier,
	world: World,
	height: number
): void {
	const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
	const inner = PLAYZONE_SIZE / 2;
	const halfWidth = BORDER_WIDTH / 2;
	const halfHeight = height / 2;
	const middle = inner + halfWidth;
	const long = inner + BORDER_WIDTH;
	const slabs = [
		[0, -middle, long, halfWidth],
		[0, middle, long, halfWidth],
		[-middle, 0, halfWidth, inner],
		[middle, 0, halfWidth, inner],
	] as const;
	for (const [x, z, halfX, halfZ] of slabs) {
		world.createCollider(
			rapier.ColliderDesc.cuboid(halfX, halfHeight, halfZ)
				.setTranslation(x, halfHeight, z)
				.setFriction(FRICTION),
			body
		);
	}
}
