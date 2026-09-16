import type { Camera } from 'three';
import type { GroundVector } from '../player/movement';
import { createJoystick } from './joystick';
import { createKeyboard } from './keyboard';
import { createMouse } from './mouse';

export interface InputSource {
	/** Writes the wanted ground direction into `out`, length 0..1. */
	read(out: GroundVector): GroundVector;
	/** Drops held state, so nothing keeps steering. */
	reset(): void;
}

/**
 * Keyboard, mouse and touch joystick. The source used last steers; the others
 * are ignored until used again. Losing focus or hiding the tab stops all of
 * them, since their release events may never arrive.
 */
export function createControls(
	surface: HTMLElement,
	camera: Camera,
	hole: GroundVector
): InputSource {
	let active: InputSource | undefined;
	const keyboard = createKeyboard(() => (active = keyboard));
	const mouse = createMouse(camera, hole, () => (active = mouse));
	const joystick = createJoystick(surface, () => (active = joystick));

	const reset = (): void => {
		keyboard.reset();
		mouse.reset();
		joystick.reset();
	};
	window.addEventListener('blur', reset);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) reset();
	});

	return {
		read(out) {
			if (active) return active.read(out);
			out.x = 0;
			out.z = 0;
			return out;
		},
		reset,
	};
}
