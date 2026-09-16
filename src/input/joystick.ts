import type { GroundVector } from '../player/movement';
import type { InputSource } from './controls';

/** Stick travel, in CSS px: the offset at which speed is full. */
const RADIUS = 56;

/**
 * Fraction of the travel ignored around the touch point, so a resting thumb
 * does not creep.
 */
const DEAD_ZONE = 0.12;

/**
 * Stick offset in CSS px (screen right +x, screen down +y) to a ground
 * direction. The camera has no yaw and screen-up is world -z, so screen axes
 * map straight onto x and z.
 */
export function stickToDirection(
	dx: number,
	dy: number,
	out: GroundVector
): GroundVector {
	const distance = Math.hypot(dx, dy);
	const travel = Math.min(distance / RADIUS, 1);
	const speed =
		travel <= DEAD_ZONE ? 0 : (travel - DEAD_ZONE) / (1 - DEAD_ZONE);
	out.x = speed ? (dx / distance) * speed : 0;
	out.z = speed ? (dy / distance) * speed : 0;
	return out;
}

/**
 * Floating virtual joystick for touch and pen: appears under the finger that
 * lands on `surface`, follows its drag, vanishes on release. Only the first
 * finger steers. DOM is written on pointer events only, never per frame.
 */
export function createJoystick(
	surface: HTMLElement,
	onUse: () => void
): InputSource {
	const base = document.createElement('div');
	base.className = 'joystick';
	base.style.setProperty('--radius', `${RADIUS}px`);
	base.hidden = true;
	const knob = document.createElement('div');
	knob.className = 'joystick-knob';
	base.append(knob);
	document.body.append(base);

	let pointerId: number | undefined;
	let originX = 0;
	let originY = 0;
	let dx = 0;
	let dy = 0;

	const release = (): void => {
		pointerId = undefined;
		dx = 0;
		dy = 0;
		base.hidden = true;
	};

	surface.addEventListener('pointerdown', (event) => {
		if (event.pointerType === 'mouse' || pointerId !== undefined) return;
		pointerId = event.pointerId;
		surface.setPointerCapture(event.pointerId);
		originX = event.clientX;
		originY = event.clientY;
		dx = 0;
		dy = 0;
		base.style.transform = `translate(${originX}px, ${originY}px)`;
		knob.style.transform = '';
		base.hidden = false;
		onUse();
	});
	surface.addEventListener('pointermove', (event) => {
		if (event.pointerId !== pointerId) return;
		dx = event.clientX - originX;
		dy = event.clientY - originY;
		// The knob stops at the rim; the offset itself is capped in the math.
		const rim = Math.min(1, RADIUS / (Math.hypot(dx, dy) || 1));
		knob.style.transform = `translate(${dx * rim}px, ${dy * rim}px)`;
	});
	const end = (event: PointerEvent): void => {
		if (event.pointerId === pointerId) release();
	};
	surface.addEventListener('pointerup', end);
	surface.addEventListener('pointercancel', end);

	return {
		read: (out) => stickToDirection(dx, dy, out),
		reset: release,
	};
}
