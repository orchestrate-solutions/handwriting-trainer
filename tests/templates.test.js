// templates.js re-exports from drills.js — verify the bridge works
import { describe, it, expect } from 'vitest';
import { DRILLS, DEFAULT_DRILL } from '../js/templates.js';

describe('templates re-exports', () => {
  it('exports DRILLS array', () => {
    expect(Array.isArray(DRILLS)).toBe(true);
    expect(DRILLS.length).toBeGreaterThan(0);
  });

  it('exports DEFAULT_DRILL', () => {
    expect(DEFAULT_DRILL).toBeDefined();
    expect(DEFAULT_DRILL.id).toBe('upper');
  });
});
