import { Color, Scene } from 'three';
import { startLoop } from './engine/loop';
import { createRenderer, resizeRenderer } from './engine/renderer';
import { createControls } from './input/controls';
import { createHoleMesh } from './player/hole';
import { moveHole, type GroundVector } from './player/movement';
import { createFpsCounter } from './ui/fps-counter';
import { createCameraRig } from './world/camera';
import { palette } from './world/palette';
import { createTerrain } from './world/terrain';
import { PLAYZONE_SEED } from './world/zones';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas missing from index.html');

const renderer = createRenderer(canvas);
const scene = new Scene();
// The outzone is the clear color: sea wherever terrain is not drawn.
scene.background = new Color(palette.sea);
scene.add(createTerrain(PLAYZONE_SEED));
const rig = createCameraRig();
const fps = createFpsCounter(document.body);

const resize = (): void => {
	const { clientWidth: width, clientHeight: height } = canvas;
	resizeRenderer(renderer, width, height);
	rig.setAspect(width / height);
};
resize();
window.addEventListener('resize', resize);

const hole = createHoleMesh();
scene.add(hole);
// Spawn at the playzone center. Both vectors are reused every frame.
const holePosition: GroundVector = { x: 0, z: 0 };
const direction: GroundVector = { x: 0, z: 0 };
const controls = createControls(canvas, rig.camera, holePosition);

startLoop((dt, now) => {
	moveHole(holePosition, controls.read(direction), dt);
	hole.position.x = holePosition.x;
	hole.position.z = holePosition.z;
	rig.follow(holePosition.x, holePosition.z);
	renderer.render(scene, rig.camera);
	fps(now);
});
