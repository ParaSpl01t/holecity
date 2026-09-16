import { palette } from '../src/world/palette';
import {
	besideHole,
	colorsAt,
	expectColor,
	expectMoving,
	expectStill,
	openGame,
	test,
	waitUntilStill,
} from './fixtures';

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
		besideHole(page, -13),
	]);
	expectColor(path!, palette.concrete, 'borderzone left of the hole');
	expectColor(sea!, palette.sea, 'outzone past the borderzone');
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
		besideHole(page, 13),
	]);
	expectColor(path!, palette.concrete, 'borderzone right of the hole');
	expectColor(sea!, palette.sea, 'outzone past the borderzone');
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
