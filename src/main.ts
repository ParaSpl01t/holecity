import { Color, Scene } from 'three';
import { startLoop } from './engine/loop';
import { createRenderer, resizeRenderer } from './engine/renderer';
import { debugEnvironment } from './environments/debug/debug';
import { createControls } from './input/controls';
import { createHoleSizeControls } from './input/hole-size';
import { generateLayout } from './objects/layout';
import { loadRapier } from './physics/physics';
import { createSimulation, type Simulation } from './physics/simulation';
import {
	HOLE_RADIUS,
	HOLE_RADIUS_STEP,
	MAX_HOLE_RADIUS,
	MIN_HOLE_RADIUS,
} from './player/dimensions';
import { createHoleView } from './player/hole';
import { moveHole, type GroundVector } from './player/movement';
import { createFpsCounter } from './ui/fps-counter';
import { createCameraRig } from './world/camera';
import { addLights } from './world/lighting';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas missing from index.html');

const environment = debugEnvironment;
const renderer = createRenderer(canvas);
const scene = new Scene();
scene.background = new Color(environment.background);
addLights(scene);
scene.add(environment.createTerrain());
const rig = createCameraRig();
const fps = createFpsCounter(document.body);

const resize = (): void => {
	const { clientWidth: width, clientHeight: height } = canvas;
	resizeRenderer(renderer, width, height);
	rig.setAspect(width / height);
};
resize();
window.addEventListener('resize', resize);

let holeRadius = HOLE_RADIUS;
const hole = createHoleView(holeRadius);
scene.add(hole.object);
// Spawn at the playzone center. Both vectors are reused every frame.
const holePosition: GroundVector = { x: 0, z: 0 };
const direction: GroundVector = { x: 0, z: 0 };
const controls = createControls(canvas, rig.camera, holePosition);

// Browser tests open the page with `?e2e` and read where the hole is: objects
// move on their own, so the picture cannot tell whether the hole moved. A
// reference, updated by the game as it plays; nothing is written per frame.
if (new URLSearchParams(location.search).has('e2e')) {
	Object.assign(window, { holecity: { hole: holePosition } });
}

// Physics arrives as its own chunk. The ground and the hole work meanwhile,
// and the objects appear once it is ready.
let simulation: Simulation | undefined;
void loadRapier().then((rapier) => {
	const layout = generateLayout(environment.seed);
	simulation = createSimulation(rapier, scene, environment, layout, holeRadius);
	// Readiness marker: browser tests wait on it before judging motion.
	canvas.dataset.physics = 'ready';
});

createHoleSizeControls((step) => {
	holeRadius = Math.min(
		Math.max(holeRadius + step * HOLE_RADIUS_STEP, MIN_HOLE_RADIUS),
		MAX_HOLE_RADIUS
	);
	hole.setRadius(holeRadius);
	simulation?.setHoleRadius(holeRadius);
});

startLoop((dt, now) => {
	moveHole(holePosition, controls.read(direction), dt);
	simulation?.update(dt, holePosition);
	hole.moveTo(holePosition.x, holePosition.z);
	rig.follow(holePosition.x, holePosition.z);
	renderer.render(scene, rig.camera);
	fps(now);
});
