import { describe, expect, it } from 'vitest';
import { HIDE_SHARE, isHidden, SHOW_SHARE } from './see-through';

describe('isHidden', () => {
	it('hides a target once more than half of it is covered', () => {
		expect(isHidden(false, HIDE_SHARE)).toBe(false);
		expect(isHidden(false, HIDE_SHARE + 0.01)).toBe(true);
	});

	it('keeps it hidden until clearly uncovered, so nothing flickers at the line', () => {
		expect(isHidden(true, HIDE_SHARE - 0.1)).toBe(true);
		expect(isHidden(true, SHOW_SHARE + 0.01)).toBe(true);
		expect(isHidden(true, SHOW_SHARE)).toBe(false);
	});
});
