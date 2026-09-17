import { describe, expect, it } from 'vitest';
import { debugEnvironment } from './debug/debug';
import type { Environment } from './environment';

const environments: [name: string, environment: Environment][] = [
	['debug', debugEnvironment],
];

describe.each(environments)('%s environment', (_, environment) => {
	it('raises the borderzone above the playzone', () => {
		expect(environment.borderHeight).toBeGreaterThan(0);
	});

	it('lowers the outzone below the borderzone top', () => {
		expect(environment.outzoneLevel).toBeLessThan(environment.borderHeight);
	});
});
