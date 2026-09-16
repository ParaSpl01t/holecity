import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		// The two vendor chunks are known and cached as immutable: three.js
		// (~550 kB) and Rapier (~2.9 MB, its WASM inlined as base64). The limit
		// sits just above Rapier, so a surprise chunk still warns.
		chunkSizeWarningLimit: 3000,
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						// three.js gets its own chunk. Its hash changes only when three is
						// upgraded, so returning players keep it cached across deploys
						// (`/assets/*` is immutable, see `vercel.json`).
						{ name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ },
					],
				},
			},
		},
	},
	test: {
		// Unit tests only. Browser tests live in `e2e/` and run under Playwright.
		include: ['src/**/*.test.ts'],
	},
});
