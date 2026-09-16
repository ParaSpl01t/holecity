import type { GroundVector } from '../player/movement';
import type { InputSource } from './controls';

/**
 * Movement keys by physical position (`event.code`), so the same keys work on
 * any layout (ZQSD on AZERTY).
 */
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

/**
 * Held keys to a ground direction. Screen-up is world -z. Diagonals are
 * normalized so they are not faster than straight lines.
 */
export function keysToDirection(
	pressed: ReadonlySet<string>,
	out: GroundVector
): GroundVector {
	const x = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'));
	const z = Number(pressed.has('KeyS')) - Number(pressed.has('KeyW'));
	const length = Math.hypot(x, z);
	out.x = length ? x / length : 0;
	out.z = length ? z / length : 0;
	return out;
}

export function createKeyboard(onUse: () => void): InputSource {
	const pressed = new Set<string>();

	window.addEventListener('keydown', (event) => {
		// Keys held with a modifier belong to browser shortcuts, and their keyup
		// can be swallowed, which would leave the hole driving on its own.
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (!MOVE_KEYS.has(event.code)) return;
		pressed.add(event.code);
		onUse();
	});
	window.addEventListener('keyup', (event) => {
		pressed.delete(event.code);
	});

	return {
		read: (out) => keysToDirection(pressed, out),
		reset: () => pressed.clear(),
	};
}
