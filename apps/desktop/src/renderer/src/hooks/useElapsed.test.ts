import { describe, expect, it } from 'vitest';
import { formatElapsed } from './useElapsed';

describe('formatElapsed', () => {
  it('formata como cronômetro', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(12 * 60_000 + 34_000)).toBe('12:34');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
    expect(formatElapsed(-5)).toBe('0:00');
  });
});
