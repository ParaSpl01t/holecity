/**
 * Colors shared by every environment, sRGB hex: the hole and the objects.
 * Pastel and cartoonish (Voodoo, Brawl Stars). Ground colors belong to each
 * environment.
 */
export const palette = {
	/** The void below the opening. */
	hole: 0x000000,
	/** The opening's edge at ground level, fading to `hole` below. */
	holeWall: 0x2e2a3a,
	holeRing: 0xffd23f,
	trunk: 0xa8734f,
	deadTrunk: 0x8e7d70,
	/** Leaf greens: deeper and bluer than the grass, so trees stand out. */
	leaves: [0x3fae6a, 0x4cbf76, 0x35a05f],
	/** Cubes and spheres. */
	toys: [0xff8fab, 0xffc55c, 0x7ec8ff, 0xb69cff, 0xff7b6b, 0x6be3c4],
	/** Puffs bursting out of something that pops. */
	puff: 0xffffff,
} as const;
