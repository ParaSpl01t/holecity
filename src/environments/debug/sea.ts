import { Color, ShaderMaterial } from 'three';
import { LAND_HALF } from '../../world/zones';
import { debugPalette } from './palette';

/**
 * Idle "bubbled white water" on the sea, all in the fragment shader: no
 * textures, no per-frame CPU work but one time uniform, set only when the sea
 * is actually drawn. Distances in m, measured outward from the land's edge.
 *
 * - Shore foam: a white band along the land's edge, breathing in and out in
 *   slow waves. Round bubbles pulse along its outer edge; each grows from the
 *   edge as the band covers its center, so none pops in.
 * - Wave lines: broken foam lines rolling in toward the shore, thickening as
 *   they come, until the band swallows them.
 * - Drifting foam: sparse clusters of round blobs on open water, each growing,
 *   drifting a little and shrinking away. Only past `CALM_REACH`.
 *
 * Every shape is anti-aliased over one pixel's footprint and fades out as it
 * shrinks below a pixel, so nothing leaves specks behind.
 */

/** Shore band: mean width, and the two wave amplitudes breathing it. */
const BAND = 0.8;
const BREATH_SLOW = 0.25;
const BREATH_FAST = 0.15;

/** Bubble grid cell, share of cells holding a bubble, and radius range. */
const BUBBLE_CELL = 1.6;
const BUBBLE_SHARE = 0.75;
const BUBBLE_RADIUS_MIN = 0.45;
const BUBBLE_RADIUS_MAX = 0.8;

/**
 * Wave lines: seconds between two, how far out past the band each starts,
 * and its thickness on arrival.
 */
const LINE_PERIOD = 4.5;
const LINE_TRAVEL = 3;
const LINE_WIDTH = 0.35;

/** Past this shore distance no shore foam or wave line is possible. */
export const SHORE_REACH =
	BAND +
	BREATH_SLOW +
	BREATH_FAST +
	Math.max(BUBBLE_RADIUS_MAX, LINE_TRAVEL + LINE_WIDTH);

/** Shore distance that drifting foam never comes closer than. */
export const CALM_REACH = 12;

/**
 * Drifting foam grid cell, share of cells holding a cluster, lifetime in s,
 * drift over a lifetime, and main blob radius. A cluster reaches at most
 * 1.55 blob radii from its center, plus half the drift; the jitter keeps that
 * inside its cell.
 */
const BLOB_CELL = 16;
const BLOB_SHARE = 0.35;
const BLOB_LIFE = 9;
const BLOB_DRIFT = 3;
const BLOB_RADIUS = 2;
const BLOB_JITTER = BLOB_CELL - 2 * (1.55 * BLOB_RADIUS + BLOB_DRIFT / 2);

/** GLSL float literal. */
const f = (value: number) => value.toFixed(4);

const vertexShader = /* glsl */ `
varying vec2 vGround;

void main() {
	vec4 world = modelMatrix * vec4(position, 1.0);
	vGround = world.xz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float time;
uniform vec3 seaColor;
uniform vec3 foamColor;
varying vec2 vGround;

const float TAU = 6.2831853;

/** Pseudo-random in [0, 1) per grid cell; salt picks an independent value. */
float hash(vec2 cell, float salt) {
	return fract(sin(dot(cell, vec2(127.1, 311.7)) + salt * 74.7) * 43758.5453);
}

/** Distance outside the land square: 0 on its edge, rounded at corners. */
float shoreDistance(vec2 p) {
	vec2 q = abs(p) - ${f(LAND_HALF)};
	return length(max(q, 0.0));
}

/** Shore band width at a point: two slow waves running along the shore. */
float bandWidth(vec2 p) {
	return ${f(BAND)}
		+ ${f(BREATH_SLOW)} * sin(time * 0.9 + 0.35 * (p.x + p.y))
		+ ${f(BREATH_FAST)} * sin(time * 1.7 - 0.6 * (p.x - p.y));
}

/**
 * Coverage in [0, 1] of a shape: signed distance to it (negative inside), its
 * narrowest width, and meters per pixel.
 */
float cover(float inside, float size, float pixel) {
	return clamp(0.5 - inside / pixel, 0.0, 1.0) * clamp(size / pixel, 0.0, 1.0);
}

/** Shore foam coverage: band, bubbles on its edge, wave lines rolling in. */
float shoreFoam(vec2 p, float shore, float pixel) {
	float band = bandWidth(p);
	float foam = cover(shore - band, band, pixel);

	vec2 cell = floor(p / ${f(BUBBLE_CELL)});
	for (int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			vec2 c = cell + vec2(i, j);
			if (hash(c, 0.0) > ${f(BUBBLE_SHARE)}) continue;
			vec2 center = (c + vec2(hash(c, 1.0), hash(c, 2.0))) * ${f(BUBBLE_CELL)};
			float depth = bandWidth(center) - shoreDistance(center);
			float pulse = 0.85 + 0.15 * sin(time * 2.3 + TAU * hash(c, 3.0));
			float radius = mix(${f(BUBBLE_RADIUS_MIN)}, ${f(BUBBLE_RADIUS_MAX)}, hash(c, 4.0))
				* pulse * smoothstep(0.0, 0.35, depth);
			foam = max(foam, cover(length(p - center) - radius, 2.0 * radius, pixel));
		}
	}

	// Arrival time varies along the shore, so lines come in at a slant.
	float phase = fract(time / ${f(LINE_PERIOD)} + 0.015 * (p.x + p.y));
	float breaks = smoothstep(-0.2, 0.4, sin(0.45 * (p.x - p.y) + 2.0 * sin(0.13 * (p.x + p.y))));
	float width = ${f(LINE_WIDTH)} * phase * breaks;
	float line = abs(shore - band - ${f(LINE_TRAVEL)} * (1.0 - phase)) - 0.5 * width;
	return max(foam, cover(line, width, pixel));
}

/** Coverage of the drifting cluster of this point's cell, if any. */
float driftingFoam(vec2 p, float pixel) {
	vec2 cell = floor(p / ${f(BLOB_CELL)});
	vec2 middle = (cell + 0.5) * ${f(BLOB_CELL)};
	// Whole cells only, so a cluster is never cut at the calm line.
	if (shoreDistance(middle) < ${f(CALM_REACH + BLOB_CELL * Math.SQRT1_2)}) return 0.0;
	if (hash(cell, 5.0) > ${f(BLOB_SHARE)}) return 0.0;

	float phase = fract(time / ${f(BLOB_LIFE)} + hash(cell, 6.0));
	float angle = TAU * hash(cell, 7.0);
	vec2 heading = vec2(cos(angle), sin(angle));
	vec2 jitter = (vec2(hash(cell, 8.0), hash(cell, 9.0)) - 0.5) * ${f(BLOB_JITTER)};
	vec2 center = middle + jitter + heading * (phase - 0.5) * ${f(BLOB_DRIFT)};
	// Grows from nothing and shrinks back to nothing, so the jump back to the
	// start of its drift is never seen.
	float radius = ${f(BLOB_RADIUS)} * (0.7 + 0.3 * hash(cell, 10.0))
		* sin(3.14159265 * phase);

	float foam = cover(length(p - center) - radius, 2.0 * radius, pixel);
	for (int k = 0; k < 2; k++) {
		float side = angle + (k == 0 ? 2.0 : -2.3);
		vec2 offset = vec2(cos(side), sin(side)) * 0.95 * radius;
		float satellite = 0.6 * radius;
		foam = max(foam, cover(length(p - center - offset) - satellite, 2.0 * satellite, pixel));
	}
	return foam;
}

void main() {
	// One pixel's footprint on the water, in m: the anti-aliasing width.
	float pixel = length(fwidth(vGround));
	float shore = shoreDistance(vGround);
	float foam = 0.0;
	if (shore < ${f(SHORE_REACH)}) foam = shoreFoam(vGround, shore, pixel);
	else if (shore > ${f(CALM_REACH)}) foam = driftingFoam(vGround, pixel);
	gl_FragColor = vec4(mix(seaColor, foamColor, foam), 1.0);
	#include <colorspace_fragment>
}
`;

/** The sea's surface material, animated by the time it is drawn at. */
export function createSeaMaterial(): ShaderMaterial {
	const material = new ShaderMaterial({
		uniforms: {
			time: { value: 0 },
			seaColor: { value: new Color(debugPalette.sea) },
			foamColor: { value: new Color(debugPalette.foam) },
		},
		vertexShader,
		fragmentShader,
	});
	material.onBeforeRender = () => {
		material.uniforms.time!.value = performance.now() / 1000;
	};
	return material;
}
