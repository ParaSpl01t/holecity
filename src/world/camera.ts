import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

/**
 * Tilt away from straight down, in degrees. Enough to show the sides of 3D
 * objects, little enough to still read as top-down.
 */
const TILT_DEG = 30;

/**
 * Camera distance from the followed point, in m. Far away with a narrow FOV
 * keeps perspective stretch low at the screen edges.
 */
const DISTANCE = 60;

/**
 * View span across the shorter screen side at the followed point, in m. Fixing
 * the short side keeps the zoom the same in portrait and landscape.
 */
const SHORT_SIDE_SPAN = 40;

export interface CameraRig {
	readonly camera: PerspectiveCamera;
	setAspect(aspect: number): void;
	/** Hard lock: the camera moves with the point, no easing. */
	follow(x: number, z: number): void;
}

export function createCameraRig(): CameraRig {
	const tilt = MathUtils.degToRad(TILT_DEG);
	// Behind (+z) and above the point, so screen-up is world -z.
	const offset = new Vector3(0, Math.cos(tilt), Math.sin(tilt)).multiplyScalar(
		DISTANCE
	);
	const tanHalfShort = SHORT_SIDE_SPAN / 2 / DISTANCE;

	const camera = new PerspectiveCamera(50, 1, 1, 500);
	// The offset never changes, so orientation is set once and following only
	// translates.
	camera.position.copy(offset);
	camera.lookAt(0, 0, 0);

	return {
		camera,
		setAspect(aspect) {
			const tanHalfVertical =
				aspect >= 1 ? tanHalfShort : tanHalfShort / aspect;
			camera.fov = MathUtils.radToDeg(2 * Math.atan(tanHalfVertical));
			camera.aspect = aspect;
			camera.updateProjectionMatrix();
		},
		follow(x, z) {
			camera.position.set(x + offset.x, offset.y, z + offset.z);
		},
	};
}
