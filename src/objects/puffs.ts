import {
	InstancedMesh,
	Matrix4,
	MeshBasicMaterial,
	SphereGeometry,
	type Scene,
} from 'three';
import { STEP } from '../physics/physics';
import { palette } from '../world/palette';

/** Most puffs alive at once, and puffs per burst. */
const CAPACITY = 64;
const PER_BURST = 8;

/** Puff lifetime range, in s. */
const LIFE_MIN = 0.3;
const LIFE_MAX = 0.45;

/** Per-step velocity kept (4 per s drag): puffs shoot out, then hang. */
const DRAG = Math.exp(-4 * STEP);

/**
 * Puff radius and speed per m of burst size, and their clamps. A 3 m burst
 * spreads ~2.5 m out before its puffs are gone.
 */
const RADIUS_PER_SIZE = 0.3;
const RADIUS_MIN = 0.3;
const RADIUS_MAX = 1.2;
const SPEED_PER_SIZE = 6;
const SPEED_MIN = 6;
const SPEED_MAX = 16;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export interface Puffs {
	/** A ring of puffs flying out and up from a point; `size` in m. */
	burst(x: number, y: number, z: number, size: number): void;
	/** Moves and ages puffs by one physics step. */
	step(): void;
	/** Writes puff matrices, `alpha` of the way from the last step to this one. */
	draw(alpha: number): void;
}

/**
 * Flat white cartoon puffs where something pops, in one instanced mesh that
 * draws nothing while no puff is alive. Fixed pool, no allocation per frame.
 */
export function createPuffs(scene: Scene): Puffs {
	const mesh = new InstancedMesh(
		new SphereGeometry(1, 12, 8),
		new MeshBasicMaterial({ color: palette.puff }),
		CAPACITY
	);
	mesh.count = 0;
	mesh.frustumCulled = false;
	scene.add(mesh);

	const position = new Float32Array(CAPACITY * 3);
	const previous = new Float32Array(CAPACITY * 3);
	const velocity = new Float32Array(CAPACITY * 3);
	const age = new Float32Array(CAPACITY);
	const life = new Float32Array(CAPACITY);
	const radius = new Float32Array(CAPACITY);
	let count = 0;
	const matrix = new Matrix4();

	/** Frees puff `i`: the last puff moves into its place. */
	const kill = (i: number) => {
		const last = --count;
		position.copyWithin(i * 3, last * 3, last * 3 + 3);
		previous.copyWithin(i * 3, last * 3, last * 3 + 3);
		velocity.copyWithin(i * 3, last * 3, last * 3 + 3);
		age[i] = age[last]!;
		life[i] = life[last]!;
		radius[i] = radius[last]!;
	};

	return {
		burst(x, y, z, size) {
			const puffRadius = clamp(size * RADIUS_PER_SIZE, RADIUS_MIN, RADIUS_MAX);
			const speed = clamp(size * SPEED_PER_SIZE, SPEED_MIN, SPEED_MAX);
			const turn = Math.random() * Math.PI * 2;
			for (let k = 0; k < PER_BURST && count < CAPACITY; k++) {
				const i = count++;
				const angle = turn + (k / PER_BURST) * Math.PI * 2;
				const rise = 0.2 + Math.random() * 0.8;
				const v = speed * (0.7 + Math.random() * 0.6);
				velocity[i * 3] = Math.cos(angle) * Math.cos(rise) * v;
				velocity[i * 3 + 1] = Math.sin(rise) * v;
				velocity[i * 3 + 2] = Math.sin(angle) * Math.cos(rise) * v;
				position[i * 3] = previous[i * 3] = x;
				position[i * 3 + 1] = previous[i * 3 + 1] = y;
				position[i * 3 + 2] = previous[i * 3 + 2] = z;
				age[i] = 0;
				life[i] = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
				radius[i] = puffRadius * (0.7 + Math.random() * 0.6);
			}
		},
		step() {
			// Backwards, so the puff moved in by `kill` has already stepped.
			for (let i = count - 1; i >= 0; i--) {
				age[i]! += STEP;
				if (age[i]! >= life[i]!) {
					kill(i);
					continue;
				}
				for (let a = i * 3; a < i * 3 + 3; a++) {
					previous[a] = position[a]!;
					velocity[a]! *= DRAG;
					position[a]! += velocity[a]! * STEP;
				}
			}
		},
		draw(alpha) {
			for (let i = 0; i < count; i++) {
				const k = Math.min((age[i]! + alpha * STEP) / life[i]!, 1);
				// Swells in the first quarter of its life, then shrinks away.
				const s = radius[i]! * Math.min(1, 0.4 + k * 2.4) * (1 - k);
				const lerp = (a: number) =>
					previous[a]! + (position[a]! - previous[a]!) * alpha;
				matrix
					.makeScale(s, s, s)
					.setPosition(lerp(i * 3), lerp(i * 3 + 1), lerp(i * 3 + 2));
				mesh.setMatrixAt(i, matrix);
			}
			mesh.count = count;
			mesh.instanceMatrix.needsUpdate = true;
		},
	};
}
