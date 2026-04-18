// Unit tests for drills.js — drill pack definitions
import { describe, it, expect } from 'vitest';
import { DRILLS, DEFAULT_DRILL } from '../js/drills.js';

describe('DRILLS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DRILLS)).toBe(true);
    expect(DRILLS.length).toBeGreaterThan(0);
  });

  it('each drill has id, label, and items', () => {
    for (const drill of DRILLS) {
      expect(typeof drill.id).toBe('string');
      expect(typeof drill.label).toBe('string');
      expect(Array.isArray(drill.items)).toBe(true);
      expect(drill.items.length).toBeGreaterThan(0);
    }
  });

  it('drill IDs are unique', () => {
    const ids = DRILLS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes uppercase drill', () => {
    const upper = DRILLS.find(d => d.id === 'upper');
    expect(upper).toBeDefined();
    expect(upper.items).toHaveLength(26);
    expect(upper.items[0]).toBe('A');
    expect(upper.items[25]).toBe('Z');
  });

  it('includes lowercase drill', () => {
    const lower = DRILLS.find(d => d.id === 'lower');
    expect(lower).toBeDefined();
    expect(lower.items).toHaveLength(26);
    expect(lower.items[0]).toBe('a');
    expect(lower.items[25]).toBe('z');
  });

  it('includes numbers drill with 0–9', () => {
    const nums = DRILLS.find(d => d.id === 'numbers');
    expect(nums).toBeDefined();
    expect(nums.items).toHaveLength(10);
    expect(nums.items[0]).toBe('0');
    expect(nums.items[9]).toBe('9');
  });

  it('includes pairs drill with multi-char items', () => {
    const pairs = DRILLS.find(d => d.id === 'pairs');
    expect(pairs).toBeDefined();
    expect(pairs.items.every(p => p.length === 2)).toBe(true);
  });

  it('includes words drill with multi-char items', () => {
    const words = DRILLS.find(d => d.id === 'words');
    expect(words).toBeDefined();
    expect(words.items.every(w => w.length >= 2)).toBe(true);
  });

  it('no drill has duplicate items', () => {
    for (const drill of DRILLS) {
      expect(new Set(drill.items).size, `${drill.id} has duplicates`).toBe(drill.items.length);
    }
  });
});

describe('DEFAULT_DRILL', () => {
  it('is the uppercase drill', () => {
    expect(DEFAULT_DRILL.id).toBe('upper');
  });

  it('is one of the DRILLS', () => {
    expect(DRILLS).toContain(DEFAULT_DRILL);
  });
});
