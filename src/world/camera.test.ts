import { MathUtils, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCameraRig } from './camera';

/** Tangent of half the view angle across the shorter screen side. */
function tanHalfShortSide(aspect: number): number {
	const rig = createCameraRig();
	rig.setAspect(aspect);
	const tanHalfVertical = Math.tan(MathUtils.degToRad(rig.camera.fov / 2));
	return aspect >= 1 ? tanHalfVertical : tanHalfVertical * aspect;
}

describe('camera rig', () => {
	it('shows the same span across the short side in any orientation', () => {
		const landscape = tanHalfShortSide(16 / 9);
		expect(tanHalfShortSide(1)).toBeCloseTo(landscape);
		expect(tanHalfShortSide(9 / 16)).toBeCloseTo(landscape);
		expect(tanHalfShortSide(390 / 844)).toBeCloseTo(landscape);
	});

	it('keeps the followed point at the screen center', () => {
		const rig = createCameraRig();
		rig.setAspect(16 / 9);
		for (const [x, z] of [
			[0, 0],
			[73, -41],
			[-100, 100],
		] as const) {
			rig.follow(x, z);
			rig.camera.updateMatrixWorld();
			const screen = new Vector3(x, 0, z).project(rig.camera);
			expect(screen.x).toBeCloseTo(0);
			expect(screen.y).toBeCloseTo(0);
		}
	});
});
