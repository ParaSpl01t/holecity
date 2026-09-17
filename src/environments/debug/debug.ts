import type { Environment } from '../environment';
import { debugPalette } from './palette';
import { createDebugTerrain } from './terrain';

/**
 * The debug environment, the first one built: tiled green playzone with accent
 * patches, tiled concrete borderzone 1 m up (admin, v0.2), and a sea whose
 * surface sits 2 m below the path top (assumed 2026-09-17, not yet confirmed
 * by the admin).
 */
export const debugEnvironment: Environment = {
	seed: 1,
	borderHeight: 1,
	outzoneLevel: -1,
	background: debugPalette.sea,
	createTerrain: () => createDebugTerrain(debugEnvironment),
};
