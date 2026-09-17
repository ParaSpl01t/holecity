import { expect, openGame, test } from './fixtures';

/** Animation frames sampled per run. */
const SAMPLES = 120;

interface PerfSample {
	frameMs: number[];
	draws: number[];
}

/** Value at quantile `q` of an ascending list. */
function quantile(sorted: number[], q: number): number {
	return (
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0
	);
}

// No budget (admin decision): the numbers are logged to spot regressions
// between runs. SwiftShader frame times are not real-device figures.
test('perf sanity: frame times and draw calls per frame', async ({
	page,
}, testInfo) => {
	// Counts WebGL draws without touching game code: the draw methods are
	// wrapped before the game creates its context. A multi-draw (batched
	// trunks) is one draw call.
	await page.addInitScript(() => {
		const counter = { draws: 0 };
		Object.assign(window, { __draws: counter });
		type Methods = Record<string, (...args: unknown[]) => unknown>;
		const wrap = (target: Methods, names: string[]) => {
			for (const name of names) {
				const original = target[name];
				if (!original) continue;
				target[name] = function (this: unknown, ...args: unknown[]) {
					counter.draws++;
					return original.apply(this, args);
				};
			}
		};
		const proto = WebGL2RenderingContext.prototype as unknown as Methods;
		wrap(proto, [
			'drawArrays',
			'drawElements',
			'drawArraysInstanced',
			'drawElementsInstanced',
		]);
		// The multi-draw extension is not a global: wrap the object the game
		// gets back, once.
		const getExtension = proto.getExtension!;
		const wrapped = new WeakSet<object>();
		proto.getExtension = function (this: unknown, ...args: unknown[]) {
			const extension = getExtension.apply(this, args) as Methods | null;
			if (args[0] === 'WEBGL_multi_draw' && extension) {
				if (!wrapped.has(extension)) {
					wrapped.add(extension);
					wrap(extension, [
						'multiDrawArraysWEBGL',
						'multiDrawElementsWEBGL',
						'multiDrawArraysInstancedWEBGL',
						'multiDrawElementsInstancedWEBGL',
					]);
				}
			}
			return extension;
		};
	});
	await openGame(page);

	const sample = await page.evaluate(
		(samples) =>
			new Promise<PerfSample>((resolve) => {
				const counter = (window as unknown as { __draws: { draws: number } })
					.__draws;
				const frameMs: number[] = [];
				const draws: number[] = [];
				let last = performance.now();
				let lastDraws = counter.draws;
				// Runs after the game's frame callback each frame, so each delta
				// is exactly one game frame's draws.
				requestAnimationFrame(function tick(now) {
					frameMs.push(now - last);
					draws.push(counter.draws - lastDraws);
					last = now;
					lastDraws = counter.draws;
					if (frameMs.length <= samples) requestAnimationFrame(tick);
					else resolve({ frameMs: frameMs.slice(1), draws: draws.slice(1) });
				});
			}),
		SAMPLES
	);

	const frameMs = [...sample.frameMs].sort((a, b) => a - b);
	const draws = [...sample.draws].sort((a, b) => a - b);
	const summary = {
		project: testInfo.project.name,
		frames: frameMs.length,
		p50Ms: Number(quantile(frameMs, 0.5).toFixed(1)),
		p95Ms: Number(quantile(frameMs, 0.95).toFixed(1)),
		drawsPerFrame: quantile(draws, 0.5),
	};
	testInfo.annotations.push({
		type: 'perf',
		description: JSON.stringify(summary),
	});
	console.log(`perf ${JSON.stringify(summary)}`);

	// Proves the measurement ran, not a budget.
	expect(summary.frames).toBe(SAMPLES);
	expect(summary.drawsPerFrame).toBeGreaterThan(0);
});
