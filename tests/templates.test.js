// Unit tests for letter templates — data integrity
import { describe, it, expect } from 'vitest';
import { TEMPLATES, LETTER_ORDER, getTemplatePoints, getTemplateStrokes } from '../js/templates.js';

describe('TEMPLATES', () => {
  it('defines all 26 letters', () => {
    expect(Object.keys(TEMPLATES)).toHaveLength(26);
  });

  it('every letter has at least one stroke', () => {
    for (const [letter, strokes] of Object.entries(TEMPLATES)) {
      expect(strokes.length, `${letter} has no strokes`).toBeGreaterThan(0);
    }
  });

  it('every stroke has at least 2 waypoints', () => {
    for (const [letter, strokes] of Object.entries(TEMPLATES)) {
      for (const stroke of strokes) {
        expect(stroke.length, `${letter} stroke too short`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('all coordinates are in 0–100 range', () => {
    for (const [letter, strokes] of Object.entries(TEMPLATES)) {
      for (const stroke of strokes) {
        for (const [x, y] of stroke) {
          expect(x, `${letter} x=${x}`).toBeGreaterThanOrEqual(0);
          expect(x, `${letter} x=${x}`).toBeLessThanOrEqual(100);
          expect(y, `${letter} y=${y}`).toBeGreaterThanOrEqual(0);
          expect(y, `${letter} y=${y}`).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

describe('LETTER_ORDER', () => {
  it('has 26 letters', () => {
    expect(LETTER_ORDER).toHaveLength(26);
  });

  it('starts with A and ends with Z', () => {
    expect(LETTER_ORDER[0]).toBe('A');
    expect(LETTER_ORDER[25]).toBe('Z');
  });
});

describe('getTemplatePoints', () => {
  it('returns flat array of [x,y] for a letter', () => {
    const pts = getTemplatePoints('A');
    expect(pts.length).toBeGreaterThan(0);
    for (const pt of pts) {
      expect(pt).toHaveLength(2);
    }
  });

  it('returns empty array for unknown letter', () => {
    expect(getTemplatePoints('!')).toEqual([]);
  });
});

describe('getTemplateStrokes', () => {
  it('returns array of stroke arrays for a letter', () => {
    const strokes = getTemplateStrokes('A');
    expect(strokes.length).toBe(3); // A has 3 strokes
    for (const stroke of strokes) {
      expect(stroke.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns empty array for unknown letter', () => {
    expect(getTemplateStrokes('!')).toEqual([]);
  });
});
