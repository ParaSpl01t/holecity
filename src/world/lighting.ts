import {
	AmbientLight,
	DataTexture,
	DirectionalLight,
	NearestFilter,
	RedFormat,
	Vector3,
	type Scene,
} from 'three';

/**
 * One cheap light model for everything 3D. Objects use toon shading in flat
 * bands; the unlit borderzone walls bake the same bands into vertex colors, so
 * both read as one style. Ambient + direct = 1: a surface facing the light
 * shows its palette color exactly, like the unlit ground.
 */
const AMBIENT = 0.55;
const DIRECT = 0.45;

/** Toon band brightness, from facing away from the light to facing it. */
const BANDS = [0.3, 0.55, 0.8, 1] as const;

/** Direction toward the light: mostly overhead, a little from the left. */
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.25).normalize();

/**
 * Adds the scene lights. Intensities carry a factor of pi, which three's
 * Lambert term divides back out.
 */
export function addLights(scene: Scene): void {
	const sun = new DirectionalLight(0xffffff, DIRECT * Math.PI);
	sun.position.copy(LIGHT_DIRECTION);
	scene.add(new AmbientLight(0xffffff, AMBIENT * Math.PI), sun);
}

/** Gradient map for `MeshToonMaterial`: one texel per band, sampled nearest. */
export function createToonGradient(): DataTexture {
	const data = new Uint8Array(BANDS.map((band) => Math.round(band * 255)));
	const texture = new DataTexture(data, BANDS.length, 1, RedFormat);
	texture.magFilter = NearestFilter;
	texture.minFilter = NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;
	return texture;
}

/**
 * Linear brightness toon shading gives a surface facing `normal`, for baking
 * into vertex colors. Same lookup as three's toon shader: the light dot
 * product mapped from [-1, 1] across the gradient.
 */
export function toonBrightness(normal: Vector3): number {
	const coord = normal.dot(LIGHT_DIRECTION) * 0.5 + 0.5;
	const band = Math.min(BANDS.length - 1, Math.floor(coord * BANDS.length));
	return AMBIENT + DIRECT * BANDS[band]!;
}
