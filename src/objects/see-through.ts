import type { World } from '@dimforge/rapier3d-compat';
import type { Rapier } from '../physics/physics';

/**
 * Something the player has to see: a disc of `radius` m around a center,
 * lying flat on the ground (the hole and its ring) or facing the camera (a
 * powerup halo).
 */
export interface SightTarget {
	x: number;
	y: number;
	z: number;
	radius: number;
	flat: boolean;
}

export interface Point {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

/**
 * A target counts as hidden once more than `HIDE_SHARE` of it is covered
 * (admin: "more than 50%"), and as seen again only under `SHOW_SHARE`, so an
 * object sitting at the line does not flicker.
 */
export const HIDE_SHARE = 0.5;
export const SHOW_SHARE = 0.35;

/** Whether a target is hidden now, given whether it was and its covered share. */
export function isHidden(was: boolean, share: number): boolean {
	return share > (was ? SHOW_SHARE : HIDE_SHARE);
}

/** Rays per target. */
const SAMPLES = 32;

/** Sunflower spiral: `SAMPLES` points spread evenly over the unit disc. */
const DISC: readonly (readonly [u: number, v: number])[] = Array.from(
	{ length: SAMPLES },
	(_, i) => {
		const r = Math.sqrt((i + 0.5) / SAMPLES);
		const angle = i * Math.PI * (3 - Math.sqrt(5));
		return [r * Math.cos(angle), r * Math.sin(angle)];
	}
);

export interface Occlusion {
	/**
	 * Measures how much of each target the objects hide, by rays from the
	 * camera to points spread over it. The share is judged per target, not per
	 * object: two objects each hiding 49% hide 98% together, and both are in
	 * the way (admin question, answered 2026-09-17). For every target hidden,
	 * calls `inTheWay` with each body any of its rays hit. Only bodies
	 * `counts` accepts cover anything.
	 */
	measure(
		camera: Point,
		targets: readonly SightTarget[],
		counts: (body: number) => boolean,
		inTheWay: (body: number) => void
	): void;
}

/**
 * Occlusion by physics ray queries: no GPU readback. Objects collide as they
 * are drawn, so their colliders are what hides a target.
 */
export function createOcclusion(rapier: Rapier, world: World): Occlusion {
	const hidden = new WeakMap<SightTarget, boolean>();
	const ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
	const objectsOnly =
		rapier.QueryFilterFlags.EXCLUDE_FIXED |
		rapier.QueryFilterFlags.EXCLUDE_KINEMATIC;
	const bodies = new Set<number>();
	let counts: (body: number) => boolean = () => false;
	let hit = false;
	const onHit = ({
		collider,
	}: {
		collider: { parent(): { handle: number } | null };
	}) => {
		const body = collider.parent();
		if (body && counts(body.handle)) {
			hit = true;
			bodies.add(body.handle);
		}
		return true;
	};

	return {
		measure(camera, targets, accept, inTheWay) {
			counts = accept;
			for (const target of targets) {
				// Camera-facing disc axes: right and up across the line of sight.
				let rightX = 1;
				let rightZ = 0;
				let upX = 0;
				let upY = 0;
				let upZ = 1;
				if (!target.flat) {
					const sx = target.x - camera.x;
					const sy = target.y - camera.y;
					const sz = target.z - camera.z;
					const flat = Math.hypot(sx, sz) || 1;
					rightX = -sz / flat;
					rightZ = sx / flat;
					// up = right x sight, normalized.
					const ux = -rightZ * sy;
					const uy = rightZ * sx - rightX * sz;
					const uz = rightX * sy;
					const length = Math.hypot(ux, uy, uz) || 1;
					upX = ux / length;
					upY = uy / length;
					upZ = uz / length;
				}

				bodies.clear();
				let blocked = 0;
				for (const [u, v] of DISC) {
					const px = target.x + (rightX * u + upX * v) * target.radius;
					const py = target.y + upY * v * target.radius;
					const pz = target.z + (rightZ * u + upZ * v) * target.radius;
					const dx = px - camera.x;
					const dy = py - camera.y;
					const dz = pz - camera.z;
					const distance = Math.hypot(dx, dy, dz);
					ray.origin.x = camera.x;
					ray.origin.y = camera.y;
					ray.origin.z = camera.z;
					ray.dir.x = dx / distance;
					ray.dir.y = dy / distance;
					ray.dir.z = dz / distance;
					hit = false;
					world.intersectionsWithRay(ray, distance, true, onHit, objectsOnly);
					if (hit) blocked++;
				}

				const now = isHidden(hidden.get(target) ?? false, blocked / SAMPLES);
				hidden.set(target, now);
				if (now) for (const body of bodies) inTheWay(body);
			}
		},
	};
}
