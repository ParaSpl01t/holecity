import { WebGLRenderer } from 'three';

/**
 * Pixel ratio ceiling. Past 2x the fill cost keeps growing while the extra
 * sharpness is not visible at game viewing distance.
 */
const MAX_PIXEL_RATIO = 2;

/**
 * WebGL renderer bound to `canvas`.
 *
 * MSAA only below 2x DPR: dense screens already hide edge aliasing, and
 * multisampling there multiplies an already large fill cost.
 *
 * Stencil is on for the hole opening, and local clipping keeps the hole off
 * the outzone.
 *
 * Context loss needs no handling here: three.js cancels the default on
 * `webglcontextlost`, skips rendering while lost, and re-uploads resources
 * lazily after `webglcontextrestored`.
 */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
	const renderer = new WebGLRenderer({
		canvas,
		antialias: window.devicePixelRatio < 2,
		powerPreference: 'high-performance',
		stencil: true,
	});
	renderer.localClippingEnabled = true;
	return renderer;
}

/** Matches the drawing buffer to the canvas CSS size at the capped DPR. */
export function resizeRenderer(
	renderer: WebGLRenderer,
	width: number,
	height: number
): void {
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
	renderer.setSize(width, height, false);
}
