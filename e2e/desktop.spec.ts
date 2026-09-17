import { debugPalette } from '../src/environments/debug/palette';
import {
	HOLE_RADIUS,
	HOLE_RADIUS_STEP,
	RING_WIDTH,
} from '../src/player/dimensions';
import { palette } from '../src/world/palette';
import { BORDER_WIDTH } from '../src/world/zones';
import {
	besideHole,
	colorsAt,
	expectColor,
	expectMoving,
	expectShaft,
	expectStill,
	openGame,
	PLAIN_WATER,
	test,
	waitUntilStill,
} from './fixtures';

const PATH = [debugPalette.concrete, debugPalette.concreteTint];

/** From a hole pinned on a playzone edge, across the path to plain water. */
const SEA_BESIDE_EDGE = BORDER_WIDTH + PLAIN_WATER;

test('WASD drives the hole into the -x -z corner, where it stops', async ({
	page,
}) => {
	await openGame(page);
	await page.keyboard.down('KeyW');
	await page.keyboard.down('KeyA');
	await expectMoving(page);
	await waitUntilStill(page);
	// Pinned on the corner: the concrete path, then the sea, to its left.
	const [path, sea] = await colorsAt(page, [
		besideHole(page, -7),
		besideHole(page, -SEA_BESIDE_EDGE),
	]);
	expectColor(path!, PATH, 'borderzone left of the hole');
	expectColor(sea!, debugPalette.sea, 'outzone past the borderzone');
	await page.keyboard.up('KeyW');
	await page.keyboard.up('KeyA');
});

test('the hole steers toward the cursor, up to the playzone edge', async ({
	page,
}) => {
	await openGame(page);
	await page.mouse.move(...besideHole(page, 10));
	await expectMoving(page);
	await waitUntilStill(page);
	// Pinned on the +x edge: the concrete path, then the sea, to its right.
	const [path, sea] = await colorsAt(page, [
		besideHole(page, 7),
		besideHole(page, SEA_BESIDE_EDGE),
	]);
	expectColor(path!, PATH, 'borderzone right of the hole');
	expectColor(sea!, debugPalette.sea, 'outzone past the borderzone');
});

test('resting the cursor on the hole stops it', async ({ page }) => {
	await openGame(page);
	await page.mouse.move(...besideHole(page, 10));
	await expectMoving(page);
	await page.mouse.move(...besideHole(page, 0));
	await expectStill(page);
});

test('the hole stops when the cursor leaves the window', async ({ page }) => {
	await openGame(page);
	await page.mouse.move(...besideHole(page, 10));
	await expectMoving(page);
	// What the browser fires as the cursor exits the page.
	await page.evaluate(() =>
		document.documentElement.dispatchEvent(
			new PointerEvent('pointerout', { pointerType: 'mouse', bubbles: true })
		)
	);
	await expectStill(page);
});

test('losing window focus stops a held key', async ({ page }) => {
	await openGame(page);
	await page.keyboard.down('KeyD');
	await expectMoving(page);
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await expectStill(page);
	await page.keyboard.up('KeyD');
});

test('] grows the hole and [ shrinks it back', async ({ page }) => {
	await openGame(page);
	// Two steps up: where the ring was is now inside the opening, and the ring
	// sits further out.
	const grown = HOLE_RADIUS + 2 * HOLE_RADIUS_STEP;
	await page.keyboard.press(']');
	await page.keyboard.press(']');
	await page.waitForTimeout(100);
	const [oldRing, newRing] = await colorsAt(page, [
		besideHole(page, HOLE_RADIUS + RING_WIDTH / 2),
		besideHole(page, grown + RING_WIDTH / 2),
	]);
	expectShaft(oldRing!, 'old ring spot, now inside the opening');
	expectColor(newRing!, palette.holeRing, 'ring after growing');

	await page.keyboard.press('[');
	await page.keyboard.press('[');
	await page.waitForTimeout(100);
	const [ring] = await colorsAt(page, [
		besideHole(page, HOLE_RADIUS + RING_WIDTH / 2),
	]);
	expectColor(ring!, palette.holeRing, 'ring after shrinking back');
});

test('the last input used steers: the cursor overrides a held key', async ({
	page,
}) => {
	await openGame(page);
	await page.keyboard.down('KeyD');
	await expectMoving(page);
	await page.mouse.move(...besideHole(page, 0));
	await expectStill(page);
	await page.keyboard.up('KeyD');
});
