import { Scene } from 'three';
import { startLoop } from './engine/loop';
import { createRenderer, resizeRenderer } from './engine/renderer';
import { createFpsCounter } from './ui/fps-counter';
import { createCameraRig } from './world/camera';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas missing from index.html');

const renderer = createRenderer(canvas);
const scene = new Scene();
const rig = createCameraRig();
const fps = createFpsCounter(document.body);

const resize = (): void => {
	const { clientWidth: width, clientHeight: height } = canvas;
	resizeRenderer(renderer, width, height);
	rig.setAspect(width / height);
};
resize();
window.addEventListener('resize', resize);

startLoop((_dt, now) => {
	renderer.render(scene, rig.camera);
	fps(now);
});
