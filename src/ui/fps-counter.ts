/**
 * Averaging window and refresh period of the readout, in ms. Steadier to read
 * than per-frame values, and keeps DOM writes off the per-frame path.
 */
const WINDOW_MS = 500;

/**
 * Appends the FPS readout to `parent`, hidden until the first full window is
 * measured. Returns the hook to call once per frame with the rAF timestamp.
 */
export function createFpsCounter(parent: HTMLElement): (now: number) => void {
	const el = document.createElement('div');
	el.className = 'fps';
	el.hidden = true;
	parent.append(el);

	let last = -Infinity;
	let windowStart = 0;
	let frames = 0;

	return (now) => {
		// A gap longer than a window (hidden tab, first frame) would drag the
		// average down, so it starts a fresh window instead.
		const stalled = now - last > WINDOW_MS;
		last = now;
		if (stalled) {
			windowStart = now;
			frames = 0;
			return;
		}

		frames++;
		const elapsed = now - windowStart;
		if (elapsed < WINDOW_MS) return;

		el.textContent = `${Math.round((frames * 1000) / elapsed)} FPS`;
		el.hidden = false;
		windowStart = now;
		frames = 0;
	};
}
