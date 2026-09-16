import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { GroundVector } from '../player/movement';
import type { InputSource } from './controls';

/**
 * Cursor distance from the hole center, in m, under which the hole stays put,
 * so it rests under a still cursor instead of jittering around it.
 */
const DEAD_ZONE = 1;

/**
 * Distance past the dead zone, in m, over which speed ramps up to full. The
 * hole eases to a stop as it reaches the cursor.
 */
const RAMP = 4;

/** Ground offset from hole to cursor, to a direction scaled by distance. */
export function offsetToDirection(
	dx: number,
	dz: number,
	out: GroundVector
): GroundVector {
	const distance = Math.hypot(dx, dz);
	const speed = Math.min(Math.max((distance - DEAD_ZONE) / RAMP, 0), 1);
	out.x = speed ? (dx / distance) * speed : 0;
	out.z = speed ? (dz / distance) * speed : 0;
	return out;
}

/**
 * Steers toward the ground point under the cursor. The camera follows the
 * hole, so a still cursor keeps steering the same way, and resting it on the
 * hole stops it. No button needed.
 */
export function createMouse(
	camera: Camera,
	hole: GroundVector,
	onUse: () => void
): InputSource {
	// Reused every frame: no per-frame allocation.
	const pointer = new Vector2();
	const ground = new Plane(new Vector3(0, 1, 0), 0);
	const raycaster = new Raycaster();
	const hit = new Vector3();
	let inside = false;

	window.addEventListener('pointermove', (event) => {
		if (event.pointerType !== 'mouse') return;
		pointer.set(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		inside = true;
		onUse();
	});
	window.addEventListener('pointerout', (event) => {
		// No related target: the cursor left the window, not just an element.
		if (event.pointerType === 'mouse' && !event.relatedTarget) inside = false;
	});

	return {
		read(out) {
			if (inside) {
				raycaster.setFromCamera(pointer, camera);
				if (raycaster.ray.intersectPlane(ground, hit)) {
					return offsetToDirection(hit.x - hole.x, hit.z - hole.z, out);
				}
			}
			out.x = 0;
			out.z = 0;
			return out;
		},
		reset: () => {
			inside = false;
		},
	};
}
