/**
 * Temporary hole size controls (admin, 2026-09-16): `[` shrinks, `]` grows,
 * and touch screens get small - and + buttons bottom-right. `onStep` receives
 * -1 or 1 per press.
 */
export function createHoleSizeControls(onStep: (step: -1 | 1) => void): void {
	window.addEventListener('keydown', (event) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		// The characters matter here, not key positions.
		if (event.key === '[') onStep(-1);
		else if (event.key === ']') onStep(1);
	});

	const bar = document.createElement('div');
	bar.className = 'size-controls';
	const buttons = [
		['-', -1, 'Shrink hole'],
		['+', 1, 'Grow hole'],
	] as const;
	for (const [label, step, name] of buttons) {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = label;
		button.setAttribute('aria-label', name);
		// On press, not release: immediate, and never waits on a double-tap.
		button.addEventListener('pointerdown', (event) => {
			event.preventDefault();
			onStep(step);
		});
		bar.append(button);
	}
	document.body.append(bar);
}
