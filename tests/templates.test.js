// Unit tests for templates.js — letter set definition
import { describe, it, expect } from 'vitest';
import { LETTER_ORDER } from '../js/templates.js';

describe('LETTER_ORDER', () => {
  it('has 26 letters', () => {
    expect(LETTER_ORDER).toHaveLength(26);
  });

  it('starts with A and ends with Z', () => {
    expect(LETTER_ORDER[0]).toBe('A');
    expect(LETTER_ORDER[25]).toBe('Z');
  });

  it('contains only uppercase single letters', () => {
    for (const l of LETTER_ORDER) {
      expect(l).toMatch(/^[A-Z]$/);
    }
  });

  it('contains no duplicates', () => {
    expect(new Set(LETTER_ORDER).size).toBe(26);
  });
});
