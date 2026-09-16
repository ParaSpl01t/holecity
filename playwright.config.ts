import { defineConfig } from '@playwright/test';

/** Port of the production preview under test. */
const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	// Software rendering is slow, and crossing half the playzone takes ~12 s.
	timeout: 60_000,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		// Headless Chromium has no GPU: WebGL needs SwiftShader.
		launchOptions: { args: ['--enable-unsafe-swiftshader'] },
	},
	webServer: {
		// Tests run against what ships: the production build, not the dev server.
		command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
	},
	projects: [
		{
			name: 'desktop',
			testMatch: ['game.spec.ts', 'desktop.spec.ts', 'perf.spec.ts'],
			use: { viewport: { width: 1280, height: 720 } },
		},
		{
			name: 'phone',
			testMatch: ['game.spec.ts', 'touch.spec.ts', 'perf.spec.ts'],
			use: {
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 3,
				isMobile: true,
				hasTouch: true,
			},
		},
	],
});
