import type { Page } from '@playwright/test';
import { debugEnvironment } from '../src/environments/debug/debug';
import { debugPalette } from '../src/environments/debug/palette';
import {
	HOLE_RADIUS,
	HOLE_RADIUS_STEP,
	RING_WIDTH,
} from '../src/player/dimensions';
import { MOVE_LIMIT } from '../src/player/movement';
import { palette } from '../src/world/palette';
import { LAND_HALF } from '../src/world/zones';
import {
	besideHole,
	colorsAt,
	expect,
	expectColor,
	expectMoving,
	expectStill,
	openGame,
	PLAIN_WATER,
	test,
	view,
	waitUntilStill,
	worldToScreen,
} from './fixtures';

type TouchType = 'touchStart' | 'touchMove' | 'touchEnd';

/**
 * Real touch input through CDP: the browser turns it into touch pointer
 * events, exactly as a finger would.
 */
async function fingerOn(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	return (type: TouchType, x = 0, y = 0) =>
		cdp.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
		});
}

test('a drag shows the joystick and steers the hole along it', async ({
	page,
}) => {
	await openGame(page);
	const finger = await fingerOn(page);
	const { cx, height } = view(page);
	const y = height * 0.7;
	await finger('touchStart', cx, y);
	await finger('touchMove', cx, y + 40);
	// Past the rim: full speed. Screen down is world +z.
	await finger('touchMove', cx, y + 80);
	await expect(page.locator('.joystick')).toBeVisible();
	await expectMoving(page);
	await waitUntilStill(page);
	// Lifted first: the joystick covers the water sampled below.
	await finger('touchEnd');
	await expect(page.locator('.joystick')).toBeHidden();
	// Pinned on the +z edge: below it on screen, past the borderzone, the sea.
	const [below] = await colorsAt(page, [
		worldToScreen(page, { x: 0, z: MOVE_LIMIT }, [
			0,
			debugEnvironment.outzoneLevel,
			LAND_HALF + PLAIN_WATER,
		]),
	]);
	expectColor(below!, debugPalette.sea, 'outzone below the +z edge');
});

test('the + button grows the hole, the - button shrinks it', async ({
	page,
}) => {
	await openGame(page);
	const grow = page.getByRole('button', { name: 'Grow hole' });
	const shrink = page.getByRole('button', { name: 'Shrink hole' });
	await expect(grow).toBeVisible();
	await expect(shrink).toBeVisible();

	const ringAt = (radius: number) => besideHole(page, radius + RING_WIDTH / 2);
	await grow.tap();
	await grow.tap();
	await page.waitForTimeout(100);
	const [grown] = await colorsAt(page, [
		ringAt(HOLE_RADIUS + 2 * HOLE_RADIUS_STEP),
	]);
	expectColor(grown!, palette.holeRing, 'ring after two + taps');

	await shrink.tap();
	await shrink.tap();
	await page.waitForTimeout(100);
	const [back] = await colorsAt(page, [ringAt(HOLE_RADIUS)]);
	expectColor(back!, palette.holeRing, 'ring after two - taps');
});

test('lifting the finger hides the joystick and stops the hole', async ({
	page,
}) => {
	await openGame(page);
	const finger = await fingerOn(page);
	const { cx, height } = view(page);
	await finger('touchStart', cx, height * 0.7);
	await finger('touchMove', cx + 80, height * 0.7);
	await expectMoving(page);
	await finger('touchEnd');
	await expect(page.locator('.joystick')).toBeHidden();
	await expectStill(page);
});
