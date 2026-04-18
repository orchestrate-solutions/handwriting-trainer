// Unit tests for scoring functions — pure math, no DOM
import { describe, it, expect } from 'vitest';
import {
  accuracyScore,
  coverageScore,
  smoothnessScore,
  compositeScore,
  pointDistances,
  distanceColor,
} from '../js/scoring.js';

// ── accuracyScore ─────────────────────────────────────────────────

describe('accuracyScore', () => {
  it('returns 0 for empty user points', () => {
    const template = [[0, 0], [50, 50], [100, 100]];
    expect(accuracyScore([], template)).toBe(0);
  });

  it('returns 1.0 for points exactly on the template', () => {
    const template = [[0, 0], [50, 50], [100, 100]];
    const user = [[0, 0], [25, 25], [50, 50], [75, 75], [100, 100]];
    expect(accuracyScore(user, template)).toBe(1);
  });

  it('returns < 1 for points slightly off the template', () => {
    const template = [[0, 0], [100, 0]];
    const user = [[50, 4]]; // 4 units off (within maxDist=8)
    const score = accuracyScore(user, template);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns 0 for points far from the template', () => {
    const template = [[0, 0], [10, 0]];
    const user = [[99, 99]]; // very far
    expect(accuracyScore(user, template)).toBe(0);
  });
});

// ── coverageScore ─────────────────────────────────────────────────

describe('coverageScore', () => {
  it('returns 0 for empty template', () => {
    expect(coverageScore([[1, 1]], [])).toBe(0);
  });

  it('returns 1.0 when all template points are covered', () => {
    const template = [[10, 10], [50, 50], [90, 90]];
    // User traces directly on template points
    const user = [[10, 10], [50, 50], [90, 90]];
    expect(coverageScore(user, template)).toBe(1);
  });

  it('returns partial coverage when some points missed', () => {
    const template = [[0, 0], [50, 0], [100, 0]];
    const user = [[0, 0]]; // only covers first point
    const score = coverageScore(user, template);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

// ── smoothnessScore ───────────────────────────────────────────────

describe('smoothnessScore', () => {
  it('returns 1 for a straight line', () => {
    const pts = [[0, 0], [10, 0], [20, 0], [30, 0]];
    expect(smoothnessScore(pts)).toBe(1);
  });

  it('returns 1 for fewer than 3 points', () => {
    expect(smoothnessScore([[0, 0], [10, 10]])).toBe(1);
    expect(smoothnessScore([[5, 5]])).toBe(1);
  });

  it('returns < 1 for a jagged path', () => {
    // Zig-zag pattern
    const pts = [[0, 0], [10, 10], [20, 0], [30, 10], [40, 0]];
    expect(smoothnessScore(pts)).toBeLessThan(1);
  });
});

// ── compositeScore ────────────────────────────────────────────────

describe('compositeScore', () => {
  it('returns object with accuracy, coverage, smoothness, overall', () => {
    const template = [[0, 0], [50, 50], [100, 100]];
    const user = [[0, 0], [50, 50], [100, 100]];
    const result = compositeScore(user, template);
    expect(result).toHaveProperty('accuracy');
    expect(result).toHaveProperty('coverage');
    expect(result).toHaveProperty('smoothness');
    expect(result).toHaveProperty('overall');
  });

  it('overall is weighted blend: 45% acc + 40% cov + 15% smooth', () => {
    const template = [[0, 0], [50, 50], [100, 100]];
    const user = [[0, 0], [50, 50], [100, 100]];
    const result = compositeScore(user, template);
    const expected = result.accuracy * 0.45 + result.coverage * 0.40 + result.smoothness * 0.15;
    expect(result.overall).toBeCloseTo(expected, 5);
  });
});

// ── pointDistances ────────────────────────────────────────────────

describe('pointDistances', () => {
  it('returns array same length as user points', () => {
    const template = [[0, 0], [100, 0]];
    const user = [[10, 0], [50, 5], [90, 0]];
    const dists = pointDistances(user, template);
    expect(dists).toHaveLength(3);
  });

  it('returns 0 for points exactly on the path', () => {
    const template = [[0, 0], [100, 0]];
    const user = [[50, 0]];
    const dists = pointDistances(user, template);
    expect(dists[0]).toBeCloseTo(0, 5);
  });
});

// ── distanceColor ─────────────────────────────────────────────────

describe('distanceColor', () => {
  it('returns green for close points (< 35% of maxDist)', () => {
    expect(distanceColor(0)).toBe('#66bb6a');
    expect(distanceColor(2)).toBe('#66bb6a');
  });

  it('returns orange for drifting points (35-65% of maxDist)', () => {
    expect(distanceColor(4)).toBe('#ffa726');
  });

  it('returns red for far points (> 65% of maxDist)', () => {
    expect(distanceColor(7)).toBe('#ef5350');
    expect(distanceColor(20)).toBe('#ef5350');
  });
});
