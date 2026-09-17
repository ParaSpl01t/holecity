import type {
	Collider,
	ColliderDesc,
	RigidBody,
	World,
} from '@dimforge/rapier3d-compat';
import {
	BoxGeometry,
	Matrix4,
	MeshToonMaterial,
	Quaternion,
	SphereGeometry,
	Vector3,
	type BufferGeometry,
	type Scene,
} from 'three';
import { OFF_LAND_GROUPS } from '../physics/hole-body';
import { FRICTION, RESTITUTION, STEP, type Rapier } from '../physics/physics';
import { ABYSS_DEPTH, GROUND_THICKNESS } from '../player/dimensions';
import { createToonGradient } from '../world/lighting';
import { LAND_HALF, PLAYZONE_SIZE } from '../world/zones';
import {
	createBatch,
	createInstances,
	type Drawer,
	type Slot,
} from './instances';
import type { ObjectSpec, TreeSpec } from './layout';
import { createPuffs } from './puffs';
import { createTrunkGeometry, trunkPieces, trunkTop } from './trunk';

/**
 * Velocity damping, per s: like rolling on grass. The hole's solid edge can
 * shove an object at full hole speed; it still comes to rest, and sleeps,
 * within a few seconds.
 */
const LINEAR_DAMPING = 0.5;
const ANGULAR_DAMPING = 2;

/** Leaf density relative to everything else (1): crowns light enough to stand. */
const LEAF_DENSITY = 0.25;

/**
 * How much narrower than the opening, in m, a leaf aims to squeeze. Covers the
 * polygon the collar approximates the circle with.
 */
const FIT_MARGIN = 0.1;

/** Most a leaf flattens under a knock: 0.45 leaves it 55% as thick. */
const MAX_KNOCK = 0.45;

/** Contact force, in N, that flattens a leaf fully on its own. */
const FULL_KNOCK_FORCE = 4000;

/**
 * Contact forces below this, in N, are not reported at all. Low, so a leaf
 * resting on the rim under part of the tree's weight still registers.
 */
const CONTACT_EVENT_THRESHOLD = 40;

/** Knock spring, per s²: fast, like a stress ball. */
const KNOCK_STIFFNESS = 140;

/** Per-step fade of a knock once the push stops (6 per s). */
const KNOCK_RELEASE = Math.exp(-6 * STEP);

/**
 * Most a leaf squeezes through an opening: 0.7 leaves it 30% as wide, pulled
 * in toward the crown's axis by the same share.
 */
const MAX_SQUEEZE = 0.7;

/** Squeeze amounts tried, smallest first, when looking for one that fits. */
const SQUEEZE_SEARCH_STEP = 0.05;

/** Squeeze spring, per s²: a steady give under the tree's weight. */
const SQUEEZE_STIFFNESS = 60;

/**
 * Steps a rim contact counts as still pressing (1/6 s). Contact events skip
 * steps while a leaf slides or bounces.
 */
const PRESS_MEMORY = 10;

/**
 * Depth, in m, the trunk base must sink below ground for a tree to count as
 * being pulled through the opening. Only the opening lets it get there.
 */
const PULLED_DEPTH = 0.3;

/**
 * Draw of the hole on a tree it is pulling through, toward its axis: spring
 * stiffness (per s²) and damping (per s), applied as acceleration at the trunk
 * top. Centers and rights the tree, so its crown can squeeze through.
 */
const PULL_STIFFNESS = 8;
const PULL_DAMPING = 4;

/** Leaf radius or squeeze change worth updating colliders for. */
const COLLIDER_EPSILON = 0.01;

const PLAYZONE_HALF = PLAYZONE_SIZE / 2;

/**
 * An object resting outside the playzone (on the path, or on a solid outzone)
 * can never be swallowed, so after 1.5 s at rest there it pops (admin,
 * 2026-09-17). At rest: asleep, or slower than `REST_SPEED` m/s and
 * `REST_SPIN` rad/s.
 */
const STRANDED_STEPS = Math.round(1.5 / STEP);
const REST_SPEED = 0.3;
const REST_SPIN = 0.5;

/**
 * A pop: the object swells to `POP_SWELL` times its size over
 * `POP_SWELL_TIME` s, shrinks to nothing by `POP_TIME` s, then bursts into
 * puffs.
 */
const POP_SWELL = 1.15;
const POP_SWELL_TIME = 0.08;
const POP_TIME = 0.25;

/** Pop scale `age` s in: a quick swell, then shrinking to nothing. */
function popScale(age: number): number {
	if (age < POP_SWELL_TIME) {
		const k = age / POP_SWELL_TIME;
		return 1 + (POP_SWELL - 1) * (1 - (1 - k) ** 2);
	}
	const k = Math.min((age - POP_SWELL_TIME) / (POP_TIME - POP_SWELL_TIME), 1);
	return POP_SWELL * (1 - k * k);
}

const speedOf = ({ x, y, z }: { x: number; y: number; z: number }) =>
	Math.hypot(x, y, z);

/**
 * Magnet powerup (admin, 2026-09-17, "ok for now"): while it is on, objects
 * that fit the opening and lie within `MAGNET_RANGE` hole radii are pulled
 * toward the hole at `MAGNET_PULL` m/s², more than grass friction (0.8 g)
 * holds back.
 */
const MAGNET_RANGE = 3;
const MAGNET_PULL = 30;

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);
const ORIGIN = new Vector3(0, 0, 0);

interface Transform {
	readonly position: Vector3;
	readonly rotation: Quaternion;
}

/** A critically damped spring: reaches its target without wobbling past it. */
interface Spring {
	value: number;
	speed: number;
	target: number;
}

const createSpring = (): Spring => ({ value: 0, speed: 0, target: 0 });

/** Advances `spring` one step, then clamps its value to [0, `max`]. */
function stepSpring(spring: Spring, stiffness: number, max: number): void {
	const damping = 2 * Math.sqrt(stiffness);
	const acceleration =
		stiffness * (spring.target - spring.value) - damping * spring.speed;
	spring.speed += acceleration * STEP;
	spring.value = Math.min(Math.max(spring.value + spring.speed * STEP, 0), max);
}

/**
 * A stress-ball leaf. Two independent deformations:
 * - a knock (any hard contact) flattens it along the push, briefly;
 * - a squeeze (pressing on the rim while the tree is pulled into an opening
 *   too narrow for it) flattens it sideways, stretches it downward and moves
 *   it toward the crown's axis. It only grows while the tree is being pulled
 *   through, and springs back once the tree is out of the opening again.
 */
interface Leaf {
	readonly collider: Collider;
	/** Center relative to the tree base, unsqueezed, in body space. */
	readonly offset: Vector3;
	/** The crown's axis: the trunk top's x and z, in body space. */
	readonly axis: { readonly x: number; readonly z: number };
	/** Radius at rest. */
	readonly radius: number;
	readonly knock: Spring;
	/** World direction of the latest knock. */
	readonly normal: Vector3;
	readonly squeeze: Spring;
	/** Step of the latest rim contact. */
	pressedAt: number;
	colliderRadius: number;
	colliderSqueeze: number;
}

type Kind = 'sphere' | 'box' | 'tree';

interface Part {
	readonly instances: Drawer;
	readonly slot: Slot;
	/** Body-space transform of the part; rebuilt per frame for leaves. */
	readonly local: Matrix4;
	readonly leaf?: Leaf;
}

interface Entity {
	readonly body: RigidBody;
	readonly kind: Kind;
	/** Cube half extents; zero for other kinds. */
	readonly half: Vector3;
	/** Sphere radius; zero for other kinds. */
	readonly radius: number;
	/** Tree trunk top center, body space; zero for other kinds. */
	readonly trunkTop: Vector3;
	/** Tree trunk convex pieces as body-space points; none for other kinds. */
	readonly trunkPieces: readonly Vector3[][];
	readonly leaves: Leaf[];
	readonly parts: Part[];
	/**
	 * Horizontal radius, in m, that has to pass the opening: a sphere's radius,
	 * a cube's half diagonal, a trunk's reach (leaves squeeze).
	 */
	readonly fit: number;
	/**
	 * Farthest any part reaches from the body's origin, in m. Once the origin is
	 * that far below the void's backdrop, the object is out of sight and removed.
	 */
	readonly extent: number;
	readonly previous: Transform;
	readonly current: Transform;
	/** Consecutive steps at rest outside the playzone. */
	strandedSteps: number;
	/** Past the land's edge: no longer collides with the hole's ground. */
	offLand: boolean;
}

/** An object popping: out of physics, still drawn until it is gone. */
interface Pop {
	readonly entity: Entity;
	/** World center of mass when it popped: what it swells and shrinks about. */
	readonly center: Vector3;
	age: number;
}

export interface HoleState {
	x: number;
	z: number;
	radius: number;
	/** The magnet powerup is on. */
	magnet: boolean;
}

export interface Point {
	x: number;
	y: number;
	z: number;
}

/**
 * A convex piece of an object for tests: the points spanning it (world), plus
 * a radius around them (0 for a cube, whose corners are the points).
 */
export interface PieceSnapshot {
	points: Point[];
	radius: number;
}

/** An object's state: for tests and debugging. */
export interface BodySnapshot {
	/** Body origin: sphere and cube centers, tree trunk bases. */
	x: number;
	y: number;
	z: number;
	/** Largest leaf squeeze, 0 for anything but a live tree. */
	squeeze: number;
	/** Cube; sphere; trunk segments plus one piece per leaf. */
	pieces: PieceSnapshot[];
}

export interface Objects {
	/** Before a physics step: keeps the last transforms for interpolation. */
	beforeStep(): void;
	/**
	 * Routes a reported contact force, in N, to any leaf among two colliders.
	 * `rim`: one of them is the ground around the opening.
	 */
	push(
		collider1: number,
		collider2: number,
		force: number,
		direction: { x: number; y: number; z: number },
		rim: boolean
	): void;
	/** After a step: reads transforms, springs leaves, removes what is gone. */
	afterStep(hole: HoleState): void;
	/** Writes instance matrices, `alpha` of the way from the last step to this one. */
	draw(alpha: number): void;
	/** Physics bodies left: cubes count one each. */
	count(): number;
	snapshot(): BodySnapshot[];
	/** White puffs bursting out of a point; `size` in m. */
	burst(x: number, y: number, z: number, size: number): void;
}

/**
 * Physics bodies and instanced meshes for every object. Stacks are one body
 * per cube, so they topple; trees are one body with trunk and leaf colliders.
 * Nothing decides that an object falls: the opening is a real gap in the
 * ground, and gravity does the rest.
 */
export function createObjects(
	rapier: Rapier,
	world: World,
	scene: Scene,
	specs: ObjectSpec[]
): Objects {
	const gradientMap = createToonGradient();
	const material = new MeshToonMaterial({ gradientMap });
	// Trunks carry a vertex color for their lighter cut face.
	const trunkMaterial = new MeshToonMaterial({
		gradientMap,
		vertexColors: true,
	});
	let cubeCount = 0;
	let sphereCount = 0;
	let leafCount = 0;
	const trunkGeometries = new Map<TreeSpec, BufferGeometry>();
	let trunkVertices = 0;
	for (const spec of specs) {
		if (spec.kind === 'stack') cubeCount += spec.cubes;
		else if (spec.kind === 'sphere') sphereCount++;
		else {
			leafCount += spec.leaves.length;
			const geometry = createTrunkGeometry(spec.trunk);
			trunkGeometries.set(spec, geometry);
			trunkVertices += geometry.getAttribute('position').count;
		}
	}
	const cubes = createInstances(new BoxGeometry(1, 1, 1), material, cubeCount);
	const spheres = createInstances(
		new SphereGeometry(1, 24, 16),
		material,
		sphereCount
	);
	// Every trunk is its own shape: one batch, still one draw call.
	const trunks = createBatch(
		trunkMaterial,
		trunkGeometries.size,
		trunkVertices
	);
	const leaves = createInstances(
		new SphereGeometry(1, 16, 12),
		material,
		leafCount
	);
	scene.add(cubes.mesh, spheres.mesh, trunks.mesh, leaves.mesh);

	const entities: Entity[] = [];
	const leafByCollider = new Map<number, Leaf>();
	/** Physics steps taken, for how recent a rim contact is. */
	let step = 0;

	const createBody = (x: number, y: number, z: number, rotation?: Quaternion) =>
		world.createRigidBody(
			rapier.RigidBodyDesc.dynamic()
				.setTranslation(x, y, z)
				.setRotation(rotation ?? new Quaternion())
				.setLinearDamping(LINEAR_DAMPING)
				.setAngularDamping(ANGULAR_DAMPING)
		);
	const attach = (desc: ColliderDesc, body: RigidBody) =>
		world.createCollider(
			desc.setFriction(FRICTION).setRestitution(RESTITUTION),
			body
		);
	const addEntity = (
		entity: Omit<
			Entity,
			| 'previous'
			| 'current'
			| 'strandedSteps'
			| 'offLand'
			| 'half'
			| 'radius'
			| 'trunkTop'
			| 'trunkPieces'
			| 'leaves'
		> &
			Partial<
				Pick<Entity, 'half' | 'radius' | 'trunkTop' | 'trunkPieces' | 'leaves'>
			>
	) => {
		const current = { position: new Vector3(), rotation: new Quaternion() };
		readTransform(entity.body, current);
		const previous = {
			position: current.position.clone(),
			rotation: current.rotation.clone(),
		};
		entities.push({
			half: new Vector3(),
			radius: 0,
			trunkTop: new Vector3(),
			trunkPieces: [],
			leaves: [],
			...entity,
			previous,
			current,
			strandedSteps: 0,
			offLand: false,
		});
	};

	for (const spec of specs) {
		if (spec.kind === 'stack') {
			const rotation = new Quaternion().setFromAxisAngle(UP, spec.yaw);
			const half = new Vector3(
				spec.width,
				spec.height,
				spec.length
			).multiplyScalar(0.5);
			const local = new Matrix4().makeScale(
				spec.width,
				spec.height,
				spec.length
			);
			for (let i = 0; i < spec.cubes; i++) {
				const body = createBody(
					spec.x,
					spec.height * (i + 0.5),
					spec.z,
					rotation
				);
				attach(rapier.ColliderDesc.cuboid(half.x, half.y, half.z), body);
				addEntity({
					body,
					kind: 'box',
					half,
					parts: [{ instances: cubes, slot: cubes.add(spec.color), local }],
					fit: Math.hypot(half.x, half.z),
					extent: half.length(),
				});
			}
		} else if (spec.kind === 'sphere') {
			const body = createBody(spec.x, spec.radius, spec.z);
			attach(rapier.ColliderDesc.ball(spec.radius), body);
			const scale = spec.radius;
			addEntity({
				body,
				kind: 'sphere',
				radius: spec.radius,
				parts: [
					{
						instances: spheres,
						slot: spheres.add(spec.color),
						local: new Matrix4().makeScale(scale, scale, scale),
					},
				],
				fit: spec.radius,
				extent: spec.radius,
			});
		} else {
			// Tree bodies sit at the trunk base; crowns are laid out pre-rotated.
			// The trunk collides as the hulls of its straight segments, the same
			// shape that is drawn.
			const body = createBody(spec.x, 0, spec.z);
			const pieces = trunkPieces(spec.trunk);
			for (const piece of pieces) {
				const hull = rapier.ColliderDesc.convexHull(
					new Float32Array(piece.flatMap(({ x, y, z }) => [x, y, z]))
				);
				if (!hull) throw new Error('trunk hull could not be built');
				attach(hull, body);
			}
			const top = trunkTop(spec.trunk);
			const parts: Part[] = [
				{
					instances: trunks,
					slot: trunks.add(trunkGeometries.get(spec)!, spec.trunkColor),
					local: new Matrix4(),
				},
			];
			const treeLeaves: Leaf[] = [];
			let extent = Math.max(...pieces.flat().map((point) => point.length()));
			for (const leafSpec of spec.leaves) {
				const collider = attach(
					rapier.ColliderDesc.ball(leafSpec.radius)
						.setTranslation(leafSpec.x, leafSpec.y, leafSpec.z)
						.setDensity(LEAF_DENSITY)
						.setActiveEvents(rapier.ActiveEvents.CONTACT_FORCE_EVENTS)
						.setContactForceEventThreshold(CONTACT_EVENT_THRESHOLD),
					body
				);
				const leaf: Leaf = {
					collider,
					offset: new Vector3(leafSpec.x, leafSpec.y, leafSpec.z),
					axis: { x: top.x, z: top.z },
					radius: leafSpec.radius,
					knock: createSpring(),
					normal: new Vector3(0, 1, 0),
					squeeze: createSpring(),
					pressedAt: -Infinity,
					colliderRadius: leafSpec.radius,
					colliderSqueeze: 0,
				};
				leafByCollider.set(collider.handle, leaf);
				treeLeaves.push(leaf);
				parts.push({
					instances: leaves,
					slot: leaves.add(leafSpec.color),
					local: new Matrix4(),
					leaf,
				});
				extent = Math.max(
					extent,
					Math.hypot(leafSpec.x, leafSpec.y, leafSpec.z) + leafSpec.radius
				);
			}
			addEntity({
				body,
				kind: 'tree',
				trunkTop: top,
				trunkPieces: pieces,
				leaves: treeLeaves,
				parts,
				fit: Math.max(...pieces.flat().map(({ x, z }) => Math.hypot(x, z))),
				extent,
			});
		}
	}

	/** Takes an object out of physics and the object list; it stays drawn. */
	const detach = (index: number): Entity => {
		const entity = entities[index]!;
		for (const leaf of entity.leaves) {
			leafByCollider.delete(leaf.collider.handle);
		}
		world.removeRigidBody(entity.body);
		const last = entities.pop()!;
		if (last !== entity) entities[index] = last;
		return entity;
	};
	const undraw = (entity: Entity) => {
		for (const part of entity.parts) part.instances.remove(part.slot);
	};
	const remove = (index: number) => undraw(detach(index));

	const pops: Pop[] = [];
	const puffs = createPuffs(scene);

	/** Pops object `index`: out of physics now, drawn shrinking a moment more. */
	const startPop = (index: number) => {
		const { x, y, z } = entities[index]!.body.worldCom();
		pops.push({ entity: detach(index), center: new Vector3(x, y, z), age: 0 });
	};

	/**
	 * Watches an object that reaches past the playzone's edge. Once its center
	 * of mass is off the land, it stops colliding with the hole's ground, which
	 * reaches far past the land, so it falls into the outzone. Returns whether
	 * it has rested outside the playzone long enough to pop.
	 */
	const isStranded = (entity: Entity, asleep: boolean): boolean => {
		const { position } = entity.current;
		const reach = Math.max(Math.abs(position.x), Math.abs(position.z));
		if (reach + entity.extent <= PLAYZONE_HALF) {
			entity.strandedSteps = 0;
			return false;
		}
		const { body } = entity;
		const center = body.worldCom();
		const outside = Math.max(Math.abs(center.x), Math.abs(center.z));
		if (!entity.offLand && outside > LAND_HALF) {
			entity.offLand = true;
			for (let c = 0; c < body.numColliders(); c++) {
				body.collider(c).setCollisionGroups(OFF_LAND_GROUPS);
			}
			body.wakeUp();
		}
		const resting =
			asleep ||
			(speedOf(body.linvel()) < REST_SPEED &&
				speedOf(body.angvel()) < REST_SPIN);
		entity.strandedSteps =
			outside > PLAYZONE_HALF && resting ? entity.strandedSteps + 1 : 0;
		return entity.strandedSteps >= STRANDED_STEPS;
	};

	// Reused every step and frame: no per-frame allocation.
	const point = new Vector3();
	const scratch = new Vector3();

	/** World position of a body-space point. */
	const toWorld = (local: Vector3, body: Transform, out: Vector3) =>
		out.copy(local).applyQuaternion(body.rotation).add(body.position);

	/** Horizontal distance from the hole center to a body-space point. */
	const reach = (local: Vector3, body: Transform, hole: HoleState) => {
		toWorld(local, body, point);
		return Math.hypot(point.x - hole.x, point.z - hole.z);
	};

	/** A leaf's body-space center at `squeeze`: pulled toward the crown's axis. */
	const leafCenter = (leaf: Leaf, squeeze: number, out: Vector3) =>
		out.set(
			leaf.axis.x + (leaf.offset.x - leaf.axis.x) * (1 - squeeze),
			leaf.offset.y,
			leaf.axis.z + (leaf.offset.z - leaf.axis.z) * (1 - squeeze)
		);

	const leafFits = (
		leaf: Leaf,
		squeeze: number,
		body: Transform,
		hole: HoleState
	) =>
		reach(leafCenter(leaf, squeeze, scratch), body, hole) +
			leaf.radius * (1 - squeeze) <=
		hole.radius - FIT_MARGIN;

	/**
	 * Squeeze a leaf needs to pass the opening as the tree lies now: none if it
	 * already fits, else one search step past the least that fits (the spring
	 * only approaches its target, so aiming at the fit exactly would never
	 * quite reach it).
	 */
	const squeezeNeeded = (leaf: Leaf, body: Transform, hole: HoleState) => {
		const steps = Math.round(MAX_SQUEEZE / SQUEEZE_SEARCH_STEP);
		for (let k = 0; k <= steps; k++) {
			const squeeze = k * SQUEEZE_SEARCH_STEP;
			if (leafFits(leaf, squeeze, body, hole)) {
				return k === 0
					? 0
					: Math.min(MAX_SQUEEZE, squeeze + SQUEEZE_SEARCH_STEP);
			}
		}
		return MAX_SQUEEZE;
	};

	/**
	 * Springs a tree's leaves and keeps their colliders matching. While the
	 * tree is pulled through, a leaf pressing on the rim squeezes as far as it
	 * needs, and never springs back until the tree is out of the opening again:
	 * letting go halfway through would wedge it on the edge.
	 */
	const updateLeaves = (entity: Entity, hole: HoleState, pulled: boolean) => {
		const body = entity.current;
		for (const leaf of entity.leaves) {
			leaf.knock.target *= KNOCK_RELEASE;
			stepSpring(leaf.knock, KNOCK_STIFFNESS, MAX_KNOCK);

			const pressed = step - leaf.pressedAt <= PRESS_MEMORY;
			if (!pulled) leaf.squeeze.target = 0;
			else if (pressed) {
				leaf.squeeze.target = Math.max(
					leaf.squeeze.target,
					squeezeNeeded(leaf, body, hole)
				);
			}
			stepSpring(leaf.squeeze, SQUEEZE_STIFFNESS, MAX_SQUEEZE);

			const squeeze = leaf.squeeze.value;
			const radius = leaf.radius * (1 - squeeze) * (1 - leaf.knock.value);
			if (Math.abs(radius - leaf.colliderRadius) > COLLIDER_EPSILON) {
				leaf.collider.setRadius(radius);
				leaf.colliderRadius = radius;
			}
			if (Math.abs(squeeze - leaf.colliderSqueeze) > COLLIDER_EPSILON) {
				leaf.collider.setTranslationWrtParent(
					leafCenter(leaf, squeeze, scratch)
				);
				leaf.colliderSqueeze = squeeze;
			}
		}
	};

	const magnetImpulse = { x: 0, y: 0, z: 0 };
	/** Pulls an object toward the hole if the magnet reaches and fits it. */
	const attract = (entity: Entity, hole: HoleState) => {
		const { position } = entity.current;
		const dx = hole.x - position.x;
		const dz = hole.z - position.z;
		const distance = Math.hypot(dx, dz);
		if (
			distance > MAGNET_RANGE * hole.radius ||
			distance < 1e-3 ||
			entity.fit > hole.radius ||
			// Already on its way down.
			position.y < -GROUND_THICKNESS
		) {
			return;
		}
		const { body } = entity;
		const scale = (body.mass() * MAGNET_PULL * STEP) / distance;
		magnetImpulse.x = dx * scale;
		magnetImpulse.z = dz * scale;
		// Wakes a sleeping object too.
		body.applyImpulse(magnetImpulse, true);
	};

	const pullPoint = new Vector3();
	const velocity = new Vector3();
	/**
	 * Draws a tree toward the hole's axis by its trunk top: a damped spring on
	 * the horizontal offset, scaled by mass.
	 */
	const pullToAxis = (entity: Entity, hole: HoleState) => {
		const { body, current } = entity;
		toWorld(entity.trunkTop, current, pullPoint);
		body.linvel(velocity);
		const scale = body.mass() * STEP;
		const x =
			(-PULL_STIFFNESS * (pullPoint.x - hole.x) - PULL_DAMPING * velocity.x) *
			scale;
		const z =
			(-PULL_STIFFNESS * (pullPoint.z - hole.z) - PULL_DAMPING * velocity.z) *
			scale;
		body.applyImpulseAtPoint({ x, y: 0, z }, pullPoint, true);
	};

	const pushLeaf = (
		handle: number,
		strength: number,
		direction: { x: number; y: number; z: number },
		rim: boolean
	) => {
		const leaf = leafByCollider.get(handle);
		if (!leaf) return;
		if (rim) leaf.pressedAt = step;
		if (strength <= leaf.knock.target) return;
		leaf.knock.target = strength;
		leaf.normal.set(direction.x, direction.y, direction.z);
		if (leaf.normal.lengthSq() > 0) leaf.normal.normalize();
		else leaf.normal.copy(UP);
	};

	const position = new Vector3();
	const rotation = new Quaternion();
	const inverse = new Quaternion();
	const axis = new Vector3();
	const radiusScale = new Vector3();
	const bodyMatrix = new Matrix4();
	const bodyToWorld = new Matrix4();
	const worldToBody = new Matrix4();
	const squeezeMatrix = new Matrix4();
	const popMatrix = new Matrix4();
	const scaleMatrix = new Matrix4();
	const moveMatrix = new Matrix4();
	const matrix = new Matrix4();

	/**
	 * Leaf body-space matrix: flattened along its knock normal and stretched
	 * across it to keep its volume; squeezed flat sideways and stretched
	 * downward in world space; scaled to its radius; placed at its (possibly
	 * pulled-in) center.
	 */
	const writeLeafMatrix = (
		leaf: Leaf,
		bodyRotation: Quaternion,
		out: Matrix4
	) => {
		inverse.copy(bodyRotation).invert();
		axis.copy(leaf.normal).applyQuaternion(inverse);
		const along = 1 - leaf.knock.value;
		const across = 1 / Math.sqrt(along);
		const k = along - across;
		const { x, y, z } = axis;
		// One matrix row per line.
		// prettier-ignore
		out.set(
			across + k * x * x, k * x * y, k * x * z, 0,
			k * y * x, across + k * y * y, k * y * z, 0,
			k * z * x, k * z * y, across + k * z * z, 0,
			0, 0, 0, 1
		);

		const squeeze = leaf.squeeze.value;
		if (squeeze > 0) {
			const wide = 1 - squeeze;
			// Longer as it narrows, but not all the volume: a fully squeezed leaf
			// would otherwise stand three times its height.
			squeezeMatrix
				.multiplyMatrices(
					worldToBody.makeRotationFromQuaternion(inverse),
					matrix.makeScale(wide, 1 / Math.sqrt(wide), wide)
				)
				.multiply(bodyToWorld.makeRotationFromQuaternion(bodyRotation));
			out.multiply(squeezeMatrix);
		}

		out.scale(radiusScale.setScalar(leaf.radius));
		out.setPosition(leafCenter(leaf, squeeze, scratch));
	};

	return {
		beforeStep() {
			for (const entity of entities) {
				entity.previous.position.copy(entity.current.position);
				entity.previous.rotation.copy(entity.current.rotation);
			}
		},
		push(collider1, collider2, force, direction, rim) {
			const strength = Math.min(MAX_KNOCK, force / FULL_KNOCK_FORCE);
			pushLeaf(collider1, strength, direction, rim);
			pushLeaf(collider2, strength, direction, rim);
		},
		afterStep(hole) {
			step++;
			for (let i = entities.length - 1; i >= 0; i--) {
				const entity = entities[i]!;
				const asleep = entity.body.isSleeping();
				if (!asleep) {
					readTransform(entity.body, entity.current);
					// Past the void's backdrop, or sunk out of sight in the sea.
					if (entity.current.position.y < -(ABYSS_DEPTH + entity.extent)) {
						remove(i);
						continue;
					}
				}
				if (hole.magnet) attract(entity, hole);
				if (isStranded(entity, asleep)) {
					startPop(i);
					continue;
				}
				if (asleep || entity.kind !== 'tree') continue;
				// Pulled through: the trunk base is in the opening, and the top is
				// not yet below the ground.
				const pulled =
					entity.current.position.y < -PULLED_DEPTH &&
					toWorld(entity.trunkTop, entity.current, point).y > -GROUND_THICKNESS;
				updateLeaves(entity, hole, pulled);
				if (pulled) pullToAxis(entity, hole);
			}
			// Backwards, so the pop moved into a finished one's place has aged.
			for (let i = pops.length - 1; i >= 0; i--) {
				const pop = pops[i]!;
				pop.age += STEP;
				if (pop.age < POP_TIME) continue;
				undraw(pop.entity);
				const { x, y, z } = pop.center;
				puffs.burst(x, y, z, pop.entity.extent);
				pops[i] = pops[pops.length - 1]!;
				pops.pop();
			}
			puffs.step();
		},
		draw(alpha) {
			for (const entity of entities) {
				position.lerpVectors(
					entity.previous.position,
					entity.current.position,
					alpha
				);
				rotation.slerpQuaternions(
					entity.previous.rotation,
					entity.current.rotation,
					alpha
				);
				bodyMatrix.compose(position, rotation, ONE);
				for (const part of entity.parts) {
					if (part.leaf) writeLeafMatrix(part.leaf, rotation, part.local);
					matrix.multiplyMatrices(bodyMatrix, part.local);
					part.instances.setMatrix(part.slot, matrix);
				}
			}
			for (const { entity, center, age } of pops) {
				// Scaled about its center of mass; its parts keep their last pose.
				const s = popScale(age + alpha * STEP);
				popMatrix
					.makeTranslation(-center.x, -center.y, -center.z)
					.premultiply(scaleMatrix.makeScale(s, s, s))
					.premultiply(
						moveMatrix.makeTranslation(center.x, center.y, center.z)
					);
				bodyMatrix
					.compose(entity.current.position, entity.current.rotation, ONE)
					.premultiply(popMatrix);
				for (const part of entity.parts) {
					matrix.multiplyMatrices(bodyMatrix, part.local);
					part.instances.setMatrix(part.slot, matrix);
				}
			}
			puffs.draw(alpha);
			cubes.commit();
			spheres.commit();
			trunks.commit();
			leaves.commit();
		},
		count() {
			return entities.length;
		},
		burst: (x, y, z, size) => puffs.burst(x, y, z, size),
		snapshot() {
			return entities.map((entity) => {
				const { current } = entity;
				const world = (local: Vector3): Point => {
					const { x, y, z } = toWorld(local, current, new Vector3());
					return { x, y, z };
				};
				const pieces: PieceSnapshot[] = [];
				if (entity.kind === 'sphere') {
					pieces.push({ points: [world(ORIGIN)], radius: entity.radius });
				} else if (entity.kind === 'box') {
					const corners: Point[] = [];
					for (const sx of [-1, 1]) {
						for (const sy of [-1, 1]) {
							for (const sz of [-1, 1]) {
								const { half } = entity;
								corners.push(
									world(new Vector3(sx * half.x, sy * half.y, sz * half.z))
								);
							}
						}
					}
					pieces.push({ points: corners, radius: 0 });
				} else {
					for (const piece of entity.trunkPieces) {
						pieces.push({ points: piece.map(world), radius: 0 });
					}
					for (const leaf of entity.leaves) {
						pieces.push({
							points: [
								world(leafCenter(leaf, leaf.squeeze.value, new Vector3())),
							],
							radius: leaf.colliderRadius,
						});
					}
				}
				return {
					x: current.position.x,
					y: current.position.y,
					z: current.position.z,
					squeeze: Math.max(0, ...entity.leaves.map((l) => l.squeeze.value)),
					pieces,
				};
			});
		},
	};
}

function readTransform(body: RigidBody, out: Transform): void {
	const { x, y, z } = body.translation();
	out.position.set(x, y, z);
	const r = body.rotation();
	out.rotation.set(r.x, r.y, r.z, r.w);
}
