import { Scene } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRandom } from '../engine/random';
import { debugEnvironment } from '../environments/debug/debug';
import type { ObjectSpec } from '../objects/layout';
import type { PieceSnapshot, Point } from '../objects/objects';
import { generateTrunk, trunkReach, trunkTop } from '../objects/trunk';
import { GROUND_THICKNESS, HOLE_RADIUS } from '../player/dimensions';
import type { GroundVector } from '../player/movement';
import { LAND_HALF, PLAYZONE_SIZE } from '../world/zones';
import { loadRapier, STEP, type Rapier } from './physics';
import { createSimulation, type Simulation } from './simulation';

let rapier: Rapier;
beforeAll(async () => {
	rapier = await loadRapier();
});

const sphere = (x: number, radius: number, z = 0): ObjectSpec => ({
	kind: 'sphere',
	x,
	z,
	footprint: radius,
	radius,
	color: 0xffffff,
});

const box = (
	x: number,
	width: number,
	height: number,
	length: number
): ObjectSpec => ({
	kind: 'stack',
	x,
	z: 0,
	footprint: Math.hypot(width, length) / 2,
	yaw: 0,
	width,
	height,
	length,
	cubes: 1,
	color: 0xffffff,
});

/** A bent, twisted trunk, the same every run. */
const trunk = generateTrunk(createRandom(3));
const top = trunkTop(trunk);

/** A live tree whose crown reaches ~3.7 m from its axis, on the trunk's top. */
const liveTree = (x: number): ObjectSpec => ({
	kind: 'tree',
	x,
	z: 0,
	footprint: 3.7,
	trunk,
	trunkColor: 0xffffff,
	leaves: [
		{ x: top.x, y: top.y + 0.7, z: top.z, radius: 1.8, color: 0xffffff },
		...[0, 1, 2].map((i) => ({
			x: top.x + Math.cos((i * 2 * Math.PI) / 3) * 1.9,
			y: top.y - 0.4,
			z: top.z + Math.sin((i * 2 * Math.PI) / 3) * 1.9,
			radius: 1.8,
			color: 0xffffff,
		})),
	],
});

const deadTree = (x: number): ObjectSpec => ({
	kind: 'tree',
	x,
	z: 0,
	footprint: trunkReach(trunk),
	trunk,
	trunkColor: 0xffffff,
	leaves: [],
});

const simulate = (specs: ObjectSpec[], holeRadius: number) =>
	createSimulation(rapier, new Scene(), debugEnvironment, specs, holeRadius);

type Path = (t: number) => GroundVector;
const at =
	(x: number): Path =>
	() => ({ x, z: 0 });

/** Runs `seconds` of simulated time, the hole following `path`. */
function run(simulation: Simulation, seconds: number, path: Path): void {
	for (let t = 0; t < seconds; t += STEP) simulation.update(STEP, path(t));
}

/** Height at which an object crossing the ground is checked: mid-thickness. */
const SURFACE = -GROUND_THICKNESS / 2;

/** Slack, in m, for contact penetration and the collar's polygon. */
const TOLERANCE = 0.5;

/**
 * Horizontal spots where a piece crosses the ground's mid-plane. A single
 * point with a radius crosses where it sits; a set of points spans a convex
 * piece, so every pair straddling the plane crosses somewhere between them.
 */
function crossings(piece: PieceSnapshot): { x: number; z: number }[] {
	const { points, radius } = piece;
	if (points.length === 1) {
		const [center] = points as [Point];
		const straddles =
			center.y - radius < SURFACE && center.y + radius > SURFACE;
		return straddles ? [center] : [];
	}
	const spots: { x: number; z: number }[] = [];
	points.forEach((a, i) => {
		for (const b of points.slice(i + 1)) {
			if ((a.y - SURFACE) * (b.y - SURFACE) >= 0) continue;
			const t = (SURFACE - a.y) / (b.y - a.y);
			spots.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
		}
	});
	return spots;
}

/**
 * Like `run`, and after every frame asserts that any object crossing the
 * ground crosses it inside the opening: the hole's border is solid and
 * nothing passes through it (admin reports, 2026-09-16). What is fully below
 * is in the void and free. Calls `onFrame` with the frame's largest leaf
 * squeeze. Every watched scenario must actually cross the ground somewhere,
 * or the check proved nothing.
 */
function runWatched(
	simulation: Simulation,
	seconds: number,
	radius: number,
	path: Path,
	onFrame: (t: number, squeeze: number) => void = () => {}
): void {
	let checked = 0;
	for (let t = 0; t < seconds; t += STEP) {
		const hole = path(t);
		simulation.update(STEP, hole);
		let squeeze = 0;
		for (const body of simulation.snapshot()) {
			squeeze = Math.max(squeeze, body.squeeze);
			for (const spot of body.pieces.flatMap(crossings)) {
				checked++;
				const offCenter = Math.hypot(spot.x - hole.x, spot.z - hole.z);
				expect(
					offCenter,
					`crosses the ground outside the opening at t=${t.toFixed(2)}`
				).toBeLessThanOrEqual(radius + TOLERANCE);
			}
		}
		onFrame(t, squeeze);
	}
	expect(checked, 'nothing ever crossed the ground').toBeGreaterThan(0);
}

describe('hole physics', () => {
	it('swallows a sphere that fits, once the hole is under it', () => {
		const simulation = simulate([sphere(20, 1.5)], HOLE_RADIUS);
		run(simulation, 1, at(0));
		expect(simulation.remaining).toBe(1);
		// Fully below ground after ~0.6 s, but still visible falling down the
		// shaft: it must not vanish yet (admin report, 2026-09-16).
		run(simulation, 1, at(20));
		expect(simulation.remaining).toBe(1);
		run(simulation, 3, at(20));
		expect(simulation.remaining).toBe(0);
	});

	it('holds a sphere too big for the opening on the rim', () => {
		const simulation = simulate([sphere(20, 3)], HOLE_RADIUS);
		runWatched(simulation, 4, HOLE_RADIUS, at(20));
		expect(simulation.remaining).toBe(1);
	});

	it('drives past a resting object without striking it', () => {
		// Resting 2.5 m off the hole's path: just outside the 2 m opening, where
		// the edge once reached the surface and struck objects "like a carrom
		// board piece" (admin report, 2026-09-16).
		const simulation = simulate([sphere(20, 1.5, 2.5)], HOLE_RADIUS);
		run(simulation, 0.5, at(0));
		const [before] = simulation.snapshot();
		run(simulation, 4, (t) => ({ x: Math.min(12 * t, 40), z: 0 }));
		const [after] = simulation.snapshot();
		expect(before).toBeDefined();
		expect(after).toBeDefined();
		const moved = Math.hypot(after!.x - before!.x, after!.z - before!.z);
		expect(moved).toBeLessThan(0.1);
	});

	it('carries a sphere it drives through at full speed, then swallows it', () => {
		const simulation = simulate([sphere(20, 1.5)], 3);
		runWatched(simulation, 4, 3, (t) => ({ x: Math.min(12 * t, 40), z: 0 }));
		expect(simulation.remaining).toBe(0);
	});

	it('squeezes a live tree through the 4 m opening, only once it presses on the rim', () => {
		const simulation = simulate([liveTree(20)], HOLE_RADIUS);
		let squeezedAt = Infinity;
		runWatched(simulation, 8, HOLE_RADIUS, at(20), (t, squeeze) => {
			if (squeeze > 0 && t < squeezedAt) squeezedAt = t;
		});
		// Its crown is ~6 m up: it drops that far before any leaf meets the rim.
		expect(squeezedAt).toBeGreaterThan(0.5);
		expect(squeezedAt).toBeLessThan(Infinity);
		expect(simulation.remaining).toBe(0);
	});

	it('swallows a dead tree standing over the 4 m opening', () => {
		const simulation = simulate([deadTree(20)], HOLE_RADIUS);
		runWatched(simulation, 6, HOLE_RADIUS, at(20));
		expect(simulation.remaining).toBe(0);
	});

	it('never squeezes a crown that already fits', () => {
		const simulation = simulate([liveTree(20)], 5);
		let most = 0;
		runWatched(simulation, 6, 5, at(20), (_, squeeze) => {
			most = Math.max(most, squeeze);
		});
		expect(most).toBe(0);
		expect(simulation.remaining).toBe(0);
	});

	it('takes a tree whole when the hole pauses under it and moves on', () => {
		const simulation = simulate([liveTree(20)], HOLE_RADIUS);
		runWatched(simulation, 10, HOLE_RADIUS, (t) => ({
			x: t < 3 ? 20 : Math.min(20 + 12 * (t - 3), 60),
			z: 0,
		}));
		expect(simulation.remaining).toBe(0);
	});

	it('never leaves a half-caught tree in the ground when the hole moves on early', () => {
		const simulation = simulate([liveTree(20)], HOLE_RADIUS);
		// The crown meets the rim at ~0.8 s; the hole leaves while the trunk
		// hangs in the opening.
		runWatched(simulation, 6, HOLE_RADIUS, (t) => ({
			x: t < 0.9 ? 20 : Math.min(20 + 12 * (t - 0.9), 60),
			z: 0,
		}));
	});

	it('never leaves a tipping bar in the ground when the hole moves back over it', () => {
		// A 6 m bar spanning x 17..23. The opening (x 19.5..23.5) holds its
		// middle, the ground its left end: it tips in around the rim, and the
		// hole then sweeps back across it.
		const simulation = simulate([box(20, 6, 2, 2)], HOLE_RADIUS);
		runWatched(simulation, 6, HOLE_RADIUS, (t) => ({
			x: t < 0.6 ? 21.5 : Math.max(21.5 - 12 * (t - 0.6), -20),
			z: 0,
		}));
	});
});

describe('outside the playzone', () => {
	it('sinks an object that is off the land into the sea', () => {
		// Over the sea, just past the path. The hole's ground reaches far past
		// the land; it must not hold the sphere up there.
		const simulation = simulate([sphere(LAND_HALF + 5, 1.5)], HOLE_RADIUS);
		run(simulation, 1.5, at(0));
		const [body] = simulation.snapshot();
		expect(body, 'still falling, not yet out of sight').toBeDefined();
		expect(body!.y + 1.5).toBeLessThan(debugEnvironment.outzoneLevel);
	});

	it('pops an object resting on the path, after a moment', () => {
		// Starts sunk into the path's top, which pushes it up to rest on it.
		const simulation = simulate(
			[sphere(PLAYZONE_SIZE / 2 + 5, 1.5)],
			HOLE_RADIUS
		);
		run(simulation, 0.5, at(0));
		expect(simulation.remaining).toBe(1);
		run(simulation, 4, at(0));
		expect(simulation.remaining).toBe(0);
	});

	it('never pops an object resting in the playzone', () => {
		const simulation = simulate([sphere(20, 1.5)], HOLE_RADIUS);
		run(simulation, 6, at(0));
		expect(simulation.remaining).toBe(1);
	});
});
