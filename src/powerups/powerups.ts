import {
	AdditiveBlending,
	BufferAttribute,
	Color,
	CylinderGeometry,
	Group,
	Mesh,
	MeshToonMaterial,
	ShaderMaterial,
	SphereGeometry,
	TorusGeometry,
	type BufferGeometry,
	type Scene,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Simulation } from '../physics/simulation';
import type { GroundVector } from '../player/movement';
import { createToonGradient } from '../world/lighting';
import { palette } from '../world/palette';
import { createDrops, HALO_RADIUS, type Drop } from './drops';

/** Halo center height above the ground, in m: its bottom floats just clear. */
const HOVER = HALO_RADIUS + 0.4;

/** The magnet bobs this many m up and down, at this many rad/s. */
const BOB = 0.25;
const BOB_SPEED = 2.4;

/** Idle spin, in rad/s. */
const SPIN = 2;

/** The halo breathes in and out by this share of its size. */
const HALO_PULSE = 0.04;

/**
 * Consuming a drop (inbox): the halo pops over `HALO_POP_TIME` s, growing by
 * `HALO_POP_GROWTH` as it fades; the magnet grows to `MAGNET_GROWTH` times its
 * size over `CONSUME_TIME` s while its spin rises exponentially to
 * `CONSUME_SPIN` rad/s, then pops into puffs of `POP_SIZE` m.
 */
const HALO_POP_TIME = 0.15;
const HALO_POP_GROWTH = 0.5;
const CONSUME_TIME = 0.8;
const MAGNET_GROWTH = 2;
const CONSUME_SPIN = 50;
const SPIN_RISE = Math.log(CONSUME_SPIN / SPIN) / CONSUME_TIME;
const POP_SIZE = 3;

/** Magnet proportions, in m: bend radius, bar thickness, leg and tip length. */
const BEND = 0.6;
const BAR = 0.24;
const LEG = 0.6;
const TIP = 0.35;

export interface Powerups {
	update(dt: number, hole: GroundVector, holeRadius: number): void;
	/** The drop waiting on the map, if any. */
	readonly drop: Drop | undefined;
}

/**
 * Powerup drops as seen and played: a red horseshoe magnet spinning and
 * bobbing inside a glowing halo; taking it pops the halo, spins the magnet up
 * until it pops, and turns the magnet's pull on (`drops.ts` decides when).
 * Two draw calls while a drop shows, none otherwise.
 */
export function createPowerups(scene: Scene, simulation: Simulation): Powerups {
	const drops = createDrops(Math.random, simulation.isClear);
	const magnet = new Mesh(
		createMagnetGeometry(),
		new MeshToonMaterial({
			gradientMap: createToonGradient(),
			vertexColors: true,
		})
	);
	const haloMaterial = createHaloMaterial();
	const halo = new Mesh(new SphereGeometry(HALO_RADIUS, 32, 16), haloMaterial);
	const drop = new Group();
	drop.add(magnet, halo);
	drop.visible = false;
	scene.add(drop);

	let time = 0;
	let angle = 0;
	/** Seconds since the drop was taken; negative while it waits. */
	let consumed = -1;

	return {
		get drop() {
			return drops.drop;
		},
		update(dt, hole, holeRadius) {
			const { spawned, taken } = drops.update(dt, hole, holeRadius);
			simulation.setMagnet(drops.magnet);
			time += dt;

			if (spawned) {
				drop.position.set(spawned.x, HOVER, spawned.z);
				drop.visible = true;
				halo.visible = true;
				magnet.scale.setScalar(1);
				consumed = -1;
			}
			if (taken) consumed = 0;
			if (!drop.visible) return;

			if (consumed < 0) {
				angle += SPIN * dt;
				magnet.position.y = BOB * Math.sin(time * BOB_SPEED);
				halo.scale.setScalar(1 + HALO_PULSE * Math.sin(time * BOB_SPEED * 0.5));
				haloMaterial.uniforms.strength!.value = 1;
			} else {
				consumed += dt;
				const pop = Math.min(consumed / HALO_POP_TIME, 1);
				halo.visible = pop < 1;
				halo.scale.setScalar(1 + HALO_POP_GROWTH * pop);
				haloMaterial.uniforms.strength!.value = 1 - pop;

				const k = Math.min(consumed / CONSUME_TIME, 1);
				magnet.scale.setScalar(1 + (MAGNET_GROWTH - 1) * k * k);
				angle += SPIN * Math.exp(SPIN_RISE * consumed) * dt;
				if (k >= 1) {
					const { x, y, z } = drop.position;
					simulation.burst(x, y + magnet.position.y, z, POP_SIZE);
					drop.visible = false;
					consumed = -1;
				}
			}
			magnet.rotation.y = angle;
		},
	};
}

/**
 * Horseshoe magnet around its center, in the xy plane: a half-ring bend on
 * top, two legs down, pole tips at their ends. One geometry, colored per
 * vertex.
 */
function createMagnetGeometry(): BufferGeometry {
	const paint = (geometry: BufferGeometry, hex: number) => {
		const color = new Color(hex);
		const count = geometry.getAttribute('position').count;
		const colors = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			colors.set([color.r, color.g, color.b], i * 3);
		}
		geometry.setAttribute('color', new BufferAttribute(colors, 3));
		return geometry;
	};
	const parts = [
		paint(new TorusGeometry(BEND, BAR, 8, 12, Math.PI), palette.magnet),
	];
	for (const side of [-1, 1]) {
		const leg = new CylinderGeometry(BAR, BAR, LEG, 8);
		leg.translate(side * BEND, -LEG / 2, 0);
		const tip = new CylinderGeometry(BAR, BAR, TIP, 8);
		tip.translate(side * BEND, -LEG - TIP / 2, 0);
		parts.push(paint(leg, palette.magnet), paint(tip, palette.magnetTip));
	}
	const magnet = mergeGeometries(parts);
	// From the tips' ends (-LEG - TIP) to the bend's top (BEND + BAR).
	magnet.translate(0, (LEG + TIP - BEND - BAR) / 2, 0);
	return magnet;
}

/**
 * Soft glow shell: brightest where the sphere turns away from the camera,
 * barely there across its middle, so the magnet inside keeps its color. Added
 * onto whatever is behind it.
 */
function createHaloMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		uniforms: {
			color: { value: new Color(palette.halo) },
			strength: { value: 1 },
		},
		vertexShader: /* glsl */ `
			varying vec3 vNormal;
			varying vec3 vToCamera;
			void main() {
				vec4 world = modelMatrix * vec4(position, 1.0);
				vNormal = mat3(modelMatrix) * normal;
				vToCamera = cameraPosition - world.xyz;
				gl_Position = projectionMatrix * viewMatrix * world;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 color;
			uniform float strength;
			varying vec3 vNormal;
			varying vec3 vToCamera;
			void main() {
				float facing = abs(dot(normalize(vNormal), normalize(vToCamera)));
				float glow = pow(1.0 - facing, 2.0) * 0.95 + 0.02;
				gl_FragColor = vec4(color * glow * strength, 1.0);
				#include <colorspace_fragment>
			}
		`,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
}
