/**
 * Longest step, in seconds, the simulation advances in one frame. A
 * backgrounded tab or a debugger pause resumes with a huge gap, and feeding
 * that through would teleport the hole.
 */
const MAX_STEP = 0.1;

/** `dt` in seconds (clamped), `now` in ms on the rAF clock. */
export type FrameHandler = (dt: number, now: number) => void;

/** Calls `onFrame` once per display frame, forever. */
export function startLoop(onFrame: FrameHandler): void {
	let last: number | undefined;
	requestAnimationFrame(function frame(now) {
		const dt = last === undefined ? 0 : Math.min((now - last) / 1000, MAX_STEP);
		last = now;
		onFrame(dt, now);
		requestAnimationFrame(frame);
	});
}
