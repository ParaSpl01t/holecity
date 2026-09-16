/**
 * Browser test helpers. The game exposes no state, so tests judge it from
 * pixels: colors sampled at known ground points, and motion from whether
 * consecutive frames are byte-identical.
 */
import { test as base, expect, type Page } from '@playwright/test';
import { HOLE_RADIUS, RING_WIDTH } from '../src/player/hole';
import { SHORT_SIDE_SPAN } from '../src/world/camera';

export { expect };

export type Rgb = [number, number, number];

/**
 * Bottom strip holding the FPS readout, in CSS px. Cropped from motion checks,
 * since its text changes on its own.
 */
export const FPS_STRIP = 40;

/** Distance from the hole center to the middle of its ring, in m. */
export const RING_MID = HOLE_RADIUS + RING_WIDTH / 2;

/**
 * Wait between frames compared for motion, in ms. At full speed the hole
 * covers meters in it.
 */
const MOTION_WINDOW_MS = 400;

/** Every test also fails on a console error or an uncaught exception. */
export const test = base.extend<{ consoleErrors: string[] }>({
	consoleErrors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on('console', (message) => {
				if (message.type() === 'error') errors.push(message.text());
			});
			page.on('pageerror', (error) => errors.push(error.message));
			await use(errors);
			expect(errors).toEqual([]);
		},
		{ auto: true },
	],
});

/**
 * Opens the game and waits for its loop to run: the FPS readout appears once
 * its first window is measured.
 */
export async function openGame(page: Page): Promise<void> {
	await page.goto('/');
	await expect(page.locator('.fps')).toBeVisible();
}

/**
 * View geometry in CSS px. The camera keeps the hole at the screen center, and
 * along the center row one meter spans `pxPerMeter`.
 */
export function view(page: Page) {
	const size = page.viewportSize();
	if (!size) throw new Error('tests need a fixed viewport');
	return {
		width: size.width,
		height: size.height,
		cx: size.width / 2,
		cy: size.height / 2,
		pxPerMeter: Math.min(size.width, size.height) / SHORT_SIDE_SPAN,
	};
}

/** Screen point `meters` right of the hole center (negative: left). */
export function besideHole(page: Page, meters: number): [number, number] {
	const { cx, cy, pxPerMeter } = view(page);
	return [cx + meters * pxPerMeter, cy];
}

/** Colors of the current frame at CSS px points, decoded inside the page. */
export async function colorsAt(
	page: Page,
	points: [number, number][]
): Promise<Rgb[]> {
	const png = await page.screenshot({ scale: 'css' });
	return page.evaluate(
		async ({ base64, points }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${base64}`;
			await image.decode();
			const canvas = new OffscreenCanvas(image.width, image.height);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('no 2d context');
			context.drawImage(image, 0, 0);
			return points.map(([x, y]) => {
				const [r = 0, g = 0, b = 0] = context.getImageData(
					Math.round(x),
					Math.round(y),
					1,
					1
				).data;
				return [r, g, b] as Rgb;
			});
		},
		{ base64: png.toString('base64'), points }
	);
}

/** Asserts `actual` matches one of `expected` (sRGB hex) within rounding. */
export function expectColor(
	actual: Rgb,
	expected: number | number[],
	label: string
): void {
	const options = Array.isArray(expected) ? expected : [expected];
	const matches = options.some((color) =>
		[16, 8, 0].every(
			(shift, i) => Math.abs(((color >> shift) & 0xff) - actual[i]!) <= 4
		)
	);
	const wanted = options.map((c) => `#${c.toString(16).padStart(6, '0')}`);
	expect(matches, `${label}: got rgb(${actual}), want ${wanted}`).toBe(true);
}

/** The frame above the FPS strip. */
async function frame(page: Page): Promise<Uint8Array> {
	const { width, height } = view(page);
	return page.screenshot({
		clip: { x: 0, y: 0, width, height: height - FPS_STRIP },
		scale: 'css',
	});
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

async function stillOverWindow(page: Page): Promise<boolean> {
	const before = await frame(page);
	await page.waitForTimeout(MOTION_WINDOW_MS);
	return sameBytes(before, await frame(page));
}

export async function expectMoving(page: Page): Promise<void> {
	expect(await stillOverWindow(page), 'view should be moving').toBe(false);
}

/** Still right now: no easing out, no drift. */
export async function expectStill(page: Page): Promise<void> {
	// One frame for the input change to reach the render.
	await page.waitForTimeout(100);
	expect(await stillOverWindow(page), 'view should be still').toBe(true);
}

/** Waits for the hole to come to rest, e.g. pinned against an edge. */
export async function waitUntilStill(page: Page): Promise<void> {
	await expect
		.poll(() => stillOverWindow(page), { timeout: 40_000 })
		.toBe(true);
}
