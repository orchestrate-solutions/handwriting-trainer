// Unit tests for difficulty.js
import { describe, it, expect } from 'vitest';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../js/difficulty.js';

describe('DIFFICULTIES', () => {
  it('is a non-empty array with exactly 4 levels', () => {
    expect(Array.isArray(DIFFICULTIES)).toBe(true);
    expect(DIFFICULTIES).toHaveLength(4);
  });

  it('each level has id, label, guideOpacity, glowOpacity, glowBlur', () => {
    for (const d of DIFFICULTIES) {
      expect(typeof d.id).toBe('string');
      expect(typeof d.label).toBe('string');
      expect(typeof d.guideOpacity).toBe('number');
      expect(typeof d.glowOpacity).toBe('number');
      expect(typeof d.glowBlur).toBe('number');
    }
  });

  it('IDs are unique', () => {
    const ids = DIFFICULTIES.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains easy, medium, hard, professional', () => {
    const ids = DIFFICULTIES.map(d => d.id);
    expect(ids).toContain('easy');
    expect(ids).toContain('medium');
    expect(ids).toContain('hard');
    expect(ids).toContain('professional');
  });

  it('guide opacity decreases from easy to professional', () => {
    const [easy, medium, hard, pro] = DIFFICULTIES;
    expect(easy.guideOpacity).toBeGreaterThan(medium.guideOpacity);
    expect(medium.guideOpacity).toBeGreaterThan(hard.guideOpacity);
    expect(hard.guideOpacity).toBeGreaterThan(pro.guideOpacity);
  });

  it('all opacities are in valid 0–1 range', () => {
    for (const d of DIFFICULTIES) {
      expect(d.guideOpacity).toBeGreaterThan(0);
      expect(d.guideOpacity).toBeLessThanOrEqual(1);
      expect(d.glowOpacity).toBeGreaterThan(0);
      expect(d.glowOpacity).toBeLessThanOrEqual(1);
    }
  });
});

describe('DEFAULT_DIFFICULTY', () => {
  it('is medium', () => {
    expect(DEFAULT_DIFFICULTY.id).toBe('medium');
  });

  it('is one of the DIFFICULTIES', () => {
    expect(DIFFICULTIES).toContain(DEFAULT_DIFFICULTY);
  });
});
