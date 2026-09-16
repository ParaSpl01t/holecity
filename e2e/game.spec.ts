import { palette } from '../src/world/palette';
import {
	besideHole,
	colorsAt,
	expect,
	expectColor,
	expectShaft,
	expectStill,
	openGame,
	RING_MID,
	test,
	view,
} from './fixtures';

const GREENS = [
	palette.mainGreen,
	palette.mainGreenTint,
	palette.accentGreen,
	palette.accentGreenTint,
];

test('spawns the hole at the center of the tiled playzone', async ({
	page,
}) => {
	await openGame(page);
	const [center, ring, grass] = await colorsAt(page, [
		besideHole(page, 0),
		besideHole(page, RING_MID),
		besideHole(page, 10),
	]);
	expectShaft(center!, 'hole center');
	expectColor(ring!, palette.holeRing, 'hole ring');
	expectColor(grass!, GREENS, 'playzone beside the hole');
	await expectStill(page);
});

test('shows the FPS readout bottom-left, white on dark', async ({ page }) => {
	await openGame(page);
	const fps = page.locator('.fps');
	await expect(fps).toHaveText(/^\d+ FPS$/);
	await expect(fps).toHaveCSS('background-color', 'rgb(17, 17, 17)');
	await expect(fps).toHaveCSS('color', 'rgb(255, 255, 255)');
	const box = await fps.boundingBox();
	expect(box?.x).toBe(0);
	expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(view(page).height, 0);
});

test('fills the viewport at a pixel ratio capped at 2, no scrolling', async ({
	page,
}) => {
	await openGame(page);
	const layout = await page.evaluate(() => {
		const canvas = document.querySelector('canvas');
		if (!canvas) throw new Error('no canvas');
		const root = document.documentElement;
		return {
			dpr: devicePixelRatio,
			viewport: [innerWidth, innerHeight],
			css: [canvas.clientWidth, canvas.clientHeight],
			buffer: [canvas.width, canvas.height],
			scroll: [root.scrollWidth, root.scrollHeight],
		};
	});
	const ratio = Math.min(layout.dpr, 2);
	expect(layout.css).toEqual(layout.viewport);
	expect(layout.buffer).toEqual(layout.css.map((n) => Math.floor(n * ratio)));
	expect(layout.scroll).toEqual(layout.viewport);
});

test('recovers from a lost WebGL context', async ({ page }) => {
	await openGame(page);
	await page.evaluate(async () => {
		const gl = document.querySelector('canvas')?.getContext('webgl2');
		const lose = gl?.getExtension('WEBGL_lose_context');
		if (!lose) throw new Error('WEBGL_lose_context unavailable');
		const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
		lose.loseContext();
		await wait(300);
		lose.restoreContext();
		await wait(500);
	});
	const [center, ring, grass] = await colorsAt(page, [
		besideHole(page, 0),
		besideHole(page, RING_MID),
		besideHole(page, 10),
	]);
	expectShaft(center!, 'hole center after restore');
	expectColor(ring!, palette.holeRing, 'hole ring after restore');
	expectColor(grass!, GREENS, 'playzone after restore');
});
