import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		// three.js alone is ~550 kB minified. The limit sits just above it, so the
		// warning still fires if any chunk grows past three.js itself.
		chunkSizeWarningLimit: 600,
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
